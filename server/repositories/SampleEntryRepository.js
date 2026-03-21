const { SampleEntry, User, QualityParameters, CookingReport, LotAllotment, PhysicalInspection, InventoryData, FinancialCalculation, Kunchinittu, Outturn } = require('../models');
const { Variety } = require('../models/Location');
const SampleEntryOffering = require('../models/SampleEntryOffering');
const { Op } = require('sequelize');
const { buildCursorQuery, formatCursorResponse } = require('../utils/cursorPagination');
const {
  SAMPLE_ENTRY_CURSOR_FIELDS,
  fetchHydratedSampleEntryPage,
  mergeWhereClauses
} = require('../utils/sampleEntryPagination');

class SampleEntryRepository {
  async create(entryData) {
    const entry = await SampleEntry.create(entryData);
    return entry.toJSON();
  }

  async findById(id, options = {}) {
    const include = [];

    if (options.includeQuality) {
      include.push({ model: QualityParameters, as: 'qualityParameters' });
    }
    if (options.includeCooking) {
      include.push({ model: CookingReport, as: 'cookingReport' });
    }
    if (options.includeAllotment) {
      include.push({
        model: LotAllotment,
        as: 'lotAllotment',
        include: options.includeInspection ? [
          {
            model: PhysicalInspection,
            as: 'physicalInspections',
            include: options.includeInventory ? [
              {
                model: InventoryData,
                as: 'inventoryData',
                include: [
                  ...(options.includeFinancial ? [{ model: FinancialCalculation, as: 'financialCalculation' }] : []),
                  { model: Kunchinittu, as: 'kunchinittu', required: false, include: [{ model: Variety, as: 'variety', attributes: ['id', 'name'] }] },
                  { model: Outturn, as: 'outturn', required: false }
                ]
              }
            ] : []
          },
          { model: User, as: 'supervisor', attributes: ['id', 'username'] }
        ] : []
      });
    }

    const entry = await SampleEntry.findByPk(id, { include });
    return entry ? entry.toJSON() : null;
  }

  async findByStatus(status, options = {}) {
    const queryOptions = {
      where: { workflowStatus: status },
      limit: options.limit || 50,
      offset: options.offset || 0,
      order: [[options.orderBy || 'createdAt', options.orderDir || 'DESC']]
    };

    const entries = await SampleEntry.findAll(queryOptions);
    return entries.map(entry => entry.toJSON());
  }

  /**
   * Build role-appropriate includes to avoid unnecessary JOINs
   * PERFORMANCE: Only load deep associations when the workflow status actually needs them
   */
  _buildIncludesForRole(role, status) {
    // Core includes - always lightweight
    const baseIncludes = [
      { model: User, as: 'creator', attributes: ['id', 'username', 'fullName'] }
    ];

    // Staff needs quality parameters for Sample Book tab (to show 100gms / quality badges)
    if (role === 'staff' && status !== 'COOKING_REPORT') {
      return [
        ...baseIncludes,
        {
          model: QualityParameters, as: 'qualityParameters', required: false,
          include: [{ model: User, as: 'reportedByUser', attributes: ['id', 'username', 'fullName'] }]
        },
        { 
          model: CookingReport, as: 'cookingReport', required: false,
          include: [{ model: User, as: 'reviewedBy', attributes: ['id', 'username', 'fullName'] }]
        }
      ];
    }

    // Quality supervisor needs quality parameters
    if (role === 'quality_supervisor') {
      return [
        ...baseIncludes,
        {
          model: QualityParameters, as: 'qualityParameters', required: false,
          include: [{ model: User, as: 'reportedByUser', attributes: ['id', 'username', 'fullName'] }]
        }
      ];
    }

    // Admin/Manager: include depth depends on the filtered status
    const lightStatuses = ['STAFF_ENTRY', 'QUALITY_CHECK', 'LOT_SELECTION', 'COOKING_REPORT', 'FINAL_REPORT'];
    const isLightQuery = status && lightStatuses.includes(status);

    if (isLightQuery) {
      const includes = [
        ...baseIncludes,
        {
          model: QualityParameters, as: 'qualityParameters', required: false,
          include: [{ model: User, as: 'reportedByUser', attributes: ['id', 'username', 'fullName'] }]
        },
        { model: User, as: 'lotSelectionByUser', attributes: ['id', 'username', 'fullName'] }
      ];

      // Add cooking report for COOKING_REPORT status
      if (status === 'COOKING_REPORT' || status === 'FINAL_REPORT') {
        includes.push({ 
          model: CookingReport, as: 'cookingReport', required: false,
          include: [{ model: User, as: 'reviewedBy', attributes: ['id', 'username', 'fullName'] }]
        });
      }

      // Add offering for FINAL_REPORT
      if (status === 'FINAL_REPORT') {
        includes.push({ model: SampleEntryOffering, as: 'offering', required: false });
      }

      return includes;
    }

    // Full depth for LOT_ALLOTMENT, PHYSICAL_INSPECTION, INVENTORY_ENTRY, etc.
    return this._buildFullIncludes(role);
  }

  /**
   * Full depth includes for deep workflow statuses
   */
  _buildFullIncludes(role, userId) {
    return [
      { model: User, as: 'creator', attributes: ['id', 'username', 'fullName'] },
      {
        model: QualityParameters, as: 'qualityParameters', required: false,
        include: [{ model: User, as: 'reportedByUser', attributes: ['id', 'username', 'fullName'] }]
      },
      { model: User, as: 'lotSelectionByUser', attributes: ['id', 'username', 'fullName'] },
      { 
        model: CookingReport, as: 'cookingReport', required: false,
        include: [{ model: User, as: 'reviewedBy', attributes: ['id', 'username', 'fullName'] }]
      },
      {
        model: LotAllotment,
        as: 'lotAllotment',
        required: role === 'physical_supervisor',
        where: (role === 'physical_supervisor' && userId) ? { allottedToSupervisorId: userId } : undefined,
        include: [
          { model: User, as: 'supervisor', attributes: ['id', 'username', 'fullName'] },
          {
            model: PhysicalInspection,
            as: 'physicalInspections',
            required: false,
            include: [
              { model: User, as: 'reportedBy', attributes: ['id', 'username', 'fullName'] },
              {
                model: InventoryData,
                as: 'inventoryData',
                required: false,
                include: [
                  { model: User, as: 'recordedBy', attributes: ['id', 'username', 'fullName'] },
                  {
                    model: FinancialCalculation,
                    as: 'financialCalculation',
                    required: false,
                    include: [
                      { model: User, as: 'owner', attributes: ['id', 'username', 'fullName'] },
                      { model: User, as: 'manager', attributes: ['id', 'username', 'fullName'] }
                    ]
                  },
                  { model: Kunchinittu, as: 'kunchinittu', required: false, include: [{ model: Variety, as: 'variety', attributes: ['id', 'name'] }] },
                  { model: Outturn, as: 'outturn', required: false }
                ]
              }
            ]
          }
        ]
      }
    ];
  }

  async findByRoleAndFilters(role, filters = {}, userId) {
    const where = {};
    const normalizeStatusFilter = (status) => {
      const key = String(status || '').toUpperCase();
      const aliases = {
        QUALITY_NEEDED: 'QUALITY_CHECK',
        // PENDING_LOT_SELECTION: 'LOT_SELECTION', // Removed as it's handled explicitly below
        PENDING_COOKING_REPORT: 'COOKING_REPORT',
        PENDING_LOTS_PASSED: 'FINAL_REPORT',
        PENDING_ALLOTTING_SUPERVISOR: 'LOT_ALLOTMENT'
      };
      return aliases[key] || key || null;
    };
    const requestedStatus = normalizeStatusFilter(filters.status);

    // Role-based filtering
    const roleStatusMap = {
      staff: null,
      paddy_supervisor: null,
      quality_supervisor: ['STAFF_ENTRY', 'QUALITY_CHECK'],
      owner: null,
      admin: null,
      manager: null,
      physical_supervisor: ['LOT_ALLOTMENT', 'PHYSICAL_INSPECTION'],
      inventory_staff: ['PHYSICAL_INSPECTION', 'INVENTORY_ENTRY', 'OWNER_FINANCIAL', 'MANAGER_FINANCIAL', 'FINAL_REVIEW'],
      financial_account: ['OWNER_FINANCIAL', 'MANAGER_FINANCIAL', 'FINAL_REVIEW']
    };

    if (requestedStatus === 'COOKING_BOOK') {
      // Only show entries currently pending cooking reports (or in RECHECK which stays in COOKING_REPORT status)
      where.workflowStatus = 'COOKING_REPORT';
      // SUPPORT RECHECK: Allow entries where decision is null (reset during recheck) 
      // OR legacy PASS_WITH_COOKING/SOLDOUT decisions
      where.lotSelectionDecision = {
        [Op.or]: [
          { [Op.eq]: null },
          { [Op.in]: ['PASS_WITH_COOKING', 'SOLDOUT'] }
        ]
      };
    } else if (requestedStatus === 'RESAMPLE_COOKING_BOOK') {
      // Resample cooking: show entries that went through resample flow.
      // After resample Pass, decision changes from FAIL to PASS_WITH_COOKING.
      // We fetch both, and rely on SampleEntryService.js to filter out non-resample entries.
      where.workflowStatus = 'COOKING_REPORT';
      where.lotSelectionDecision = { [Op.in]: ['FAIL', 'PASS_WITH_COOKING'] };
    } else if (requestedStatus === 'PENDING_LOT_SELECTION') {
      where.workflowStatus = { [Op.in]: ['QUALITY_CHECK', 'LOT_SELECTION'] };
    } else if (requestedStatus === 'MILL_SAMPLE') {
      // Staff view: Mill Sample tab
      // Include normal STAFF_ENTRY and failed lots (resamples) that need new quality
      where[Op.and] = [
        {
          [Op.or]: [
            { workflowStatus: 'STAFF_ENTRY' },
            { lotSelectionDecision: 'FAIL' }
          ]
        },
        { workflowStatus: { [Op.ne]: 'FAILED' } }, // Exclude permanently failed
        {
          [Op.or]: [
            { entryType: { [Op.ne]: 'LOCATION_SAMPLE' } },
            { entryType: 'LOCATION_SAMPLE', sampleGivenToOffice: true }
          ]
        }
      ];
    } else if (requestedStatus === 'LOCATION_SAMPLE') {
      // Staff view: Location Sample tab
      where[Op.and] = [
        {
          [Op.or]: [
            { workflowStatus: 'STAFF_ENTRY' },
            { lotSelectionDecision: 'FAIL' }
          ]
        },
        { workflowStatus: { [Op.ne]: 'FAILED' } },
        {
          [Op.or]: [
            { lotSelectionDecision: 'FAIL' },
            {
              [Op.and]: [
                { entryType: 'LOCATION_SAMPLE' },
                { sampleGivenToOffice: { [Op.ne]: true } }
              ]
            }
          ]
        }
      ];
    } else if (requestedStatus === 'SAMPLE_BOOK') {
      // Staff view: Sample Book
      // Keep this broad so staff sample-book can show active, sold-out, and failed rows.
    } else if (requestedStatus) {
      if (requestedStatus === 'QUALITY_CHECK' && filters.entryType === 'RICE_SAMPLE') {
        where.workflowStatus = {
          [Op.in]: ['QUALITY_CHECK', 'COOKING_REPORT', 'LOT_SELECTION']
        };
      } else {
        where.workflowStatus = requestedStatus;
        if (requestedStatus === 'QUALITY_CHECK' && filters.entryType !== 'RICE_SAMPLE') {
          where[Op.or] = [
            { lotSelectionDecision: { [Op.ne]: 'FAIL' } },
            { lotSelectionDecision: { [Op.is]: null } }
          ];
        }
      }
    } else if (roleStatusMap[role] !== null && roleStatusMap[role]) {
      where.workflowStatus = roleStatusMap[role];
    }

    if (filters.entryType) {
      where.entryType = filters.entryType;
    } else if (filters.excludeEntryType) {
      where.entryType = { [Op.ne]: filters.excludeEntryType };
    }

    if (filters.sampleType) {
      const sampleType = String(filters.sampleType || '').toUpperCase();
      let typeClause = null;
      if (sampleType === 'LS') typeClause = { entryType: 'LOCATION_SAMPLE' };
      if (sampleType === 'RL') typeClause = { entryType: 'DIRECT_LOADED_VEHICLE' };
      if (sampleType === 'MS') {
        typeClause = { entryType: { [Op.notIn]: ['LOCATION_SAMPLE', 'DIRECT_LOADED_VEHICLE', 'RICE_SAMPLE'] } };
      }
      if (typeClause) {
        if (where.entryType) {
          where[Op.and] = [...(where[Op.and] || []), { entryType: where.entryType }, typeClause];
          delete where.entryType;
        } else {
          Object.assign(where, typeClause);
        }
      }
    }

    if (filters.startDate || filters.endDate) {
      if (filters.startDate && !filters.endDate) {
        where.entryDate = filters.startDate;
      } else {
        where.entryDate = {};
        if (filters.startDate) where.entryDate[Op.gte] = filters.startDate;
        if (filters.endDate) where.entryDate[Op.lte] = filters.endDate;
      }
    }

    if (filters.broker) where.brokerName = { [Op.iLike]: `%${filters.broker}%` };
    if (filters.variety) where.variety = { [Op.iLike]: `%${filters.variety}%` };
    if (filters.party) where.partyName = { [Op.iLike]: `%${filters.party}%` };
    if (filters.location) where.location = { [Op.iLike]: `%${filters.location}%` };
    if (filters.collectedBy) where.sampleCollectedBy = { [Op.iLike]: `%${filters.collectedBy}%` };

    const staffType = String(filters.staffType || '').trim().toLowerCase();
    const username = String(filters.staffUsername || '').trim().toLowerCase();
    let staffVisibilityClause = null;

    if (role !== 'admin' && role !== 'manager') {
      if (staffType === 'mill') {
        staffVisibilityClause = {
          [Op.or]: [
            { entryType: { [Op.ne]: 'LOCATION_SAMPLE' } },
            { entryType: 'LOCATION_SAMPLE', sampleGivenToOffice: true }
          ]
        };
      } else {
        staffVisibilityClause = {
          [Op.or]: [
            {
              [Op.and]: [
                { lotSelectionDecision: 'FAIL' },
                ...(username ? [{ sampleCollectedBy: { [Op.iLike]: `%${username}%` } }] : [{ id: null }])
              ]
            },
            {
              [Op.and]: [
                {
                  [Op.or]: [
                    { lotSelectionDecision: { [Op.ne]: 'FAIL' } },
                    { lotSelectionDecision: null }
                  ]
                },
                {
                  [Op.or]: [
                    { entryType: { [Op.ne]: 'LOCATION_SAMPLE' } },
                    { createdByUserId: userId },
                    ...(username ? [{ sampleCollectedBy: { [Op.iLike]: `%${username}%` } }] : []),
                    { sampleGivenToOffice: true },
                    { workflowStatus: { [Op.ne]: 'STAFF_ENTRY' } }
                  ]
                }
              ]
            }
          ]
        };
      }

      // DEBUG: Log privacy enforcement details
      console.log('[PRIVACY] Enforcing for:', {
        role, staffType, username, userId,
        hasVisibilityClause: !!staffVisibilityClause,
        requestedStatus
      });
    } else {
      console.log('[PRIVACY] BYPASSED for admin/manager:', { role, userId });
    }

    const baseWhere = mergeWhereClauses(where, staffVisibilityClause);

    const activeStatus = requestedStatus || (roleStatusMap[role] && roleStatusMap[role].length === 1 ? roleStatusMap[role][0] : null);
    const statusesToInclude = requestedStatus === 'COOKING_BOOK' || requestedStatus === 'RESAMPLE_COOKING_BOOK'
      ? ['COOKING_REPORT']
      : (requestedStatus === 'QUALITY_CHECK' && filters.entryType === 'RICE_SAMPLE' 
          ? ['QUALITY_CHECK', 'COOKING_REPORT', 'LOT_SELECTION'] 
          : (requestedStatus === 'PENDING_LOT_SELECTION'
              ? ['QUALITY_CHECK', 'LOT_SELECTION']
              : (activeStatus ? [activeStatus] : [])));

    const include = this._buildIncludesForRole(role, statusesToInclude.length > 0 ? statusesToInclude[0] : null);

    if (requestedStatus === 'COOKING_BOOK' || requestedStatus === 'RESAMPLE_COOKING_BOOK' || (requestedStatus === 'QUALITY_CHECK' && filters.entryType === 'RICE_SAMPLE')) {
      const crInclude = include.find(i => i.as === 'cookingReport');
      if (!crInclude) {
        const { CookingReport } = require('../models');
        include.push({ model: CookingReport, as: 'cookingReport', required: false });
      }
    }

    if (role === 'physical_supervisor' && userId) {
      const lotAllotmentInclude = include.find(i => i.as === 'lotAllotment');
      if (lotAllotmentInclude) {
        lotAllotmentInclude.where = { allottedToSupervisorId: userId };
        lotAllotmentInclude.required = true;
      }
    }

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const pageSize = Math.max(1, parseInt(filters.pageSize, 10) || 50);
    const paginationQuery = buildCursorQuery(filters, 'DESC', {
      fields: SAMPLE_ENTRY_CURSOR_FIELDS
    });
    const hasJoinFilter = (clause) => {
      if (!clause || typeof clause !== 'object') return false;
      if (Array.isArray(clause)) return clause.some(hasJoinFilter);
      
      const stringKeys = Object.keys(clause);
      const symbolKeys = Object.getOwnPropertySymbols(clause);
      const allKeys = [...stringKeys, ...symbolKeys];
      
      return allKeys.some((key) => {
        if (typeof key === 'string' && key.includes('$')) return true;
        return hasJoinFilter(clause[key]);
      });
    };
    const requiresJoinFiltering = include.some((item) => item.required || item.where) || hasJoinFilter(baseWhere);

    if (requiresJoinFiltering) {
      const queryOptions = {
        where: mergeWhereClauses(baseWhere, paginationQuery.where),
        include,
        limit: paginationQuery.limit,
        ...(paginationQuery.isCursor ? {} : { offset: paginationQuery.offset }),
        order: paginationQuery.order,
        distinct: true,
        subQuery: false
      };

      if (paginationQuery.isCursor) {
        const rows = await SampleEntry.findAll(queryOptions);
        const response = formatCursorResponse(rows, paginationQuery.limit, null, {
          fields: SAMPLE_ENTRY_CURSOR_FIELDS
        });
        return {
          entries: response.data.map((entry) => entry.toJSON()),
          pagination: response.pagination
        };
      }

      if (page === 1) {
        const { count, rows } = await SampleEntry.findAndCountAll(queryOptions);
        return {
          entries: rows.map((entry) => entry.toJSON()),
          total: count,
          page,
          pageSize,
          totalPages: Math.ceil(count / pageSize)
        };
      }

      const rows = await SampleEntry.findAll(queryOptions);
      return {
        entries: rows.map((entry) => entry.toJSON()),
        total: null,
        page,
        pageSize,
        totalPages: null
      };
    }

    const result = await fetchHydratedSampleEntryPage({
      model: SampleEntry,
      baseWhere,
      paginationQuery,
      hydrateOptions: {
        include,
        subQuery: false
      },
      page,
      pageSize,
      countOnPageOneOnly: true
    });

    return {
      ...result,
      entries: result.entries.map((entry) => entry.toJSON())
    };
  }

  async update(id, updates) {
    const entry = await SampleEntry.findByPk(id);
    if (!entry) return null;

    await entry.update(updates);
    return entry.toJSON();
  }

  async getLedger(filters = {}) {
    const where = {};

    if (filters.startDate || filters.endDate) {
      if (filters.startDate && !filters.endDate) {
        where.entryDate = filters.startDate;
      } else {
        where.entryDate = {};
        if (filters.startDate) where.entryDate[Op.gte] = filters.startDate;
        if (filters.endDate) where.entryDate[Op.lte] = filters.endDate;
      }
    }
    if (filters.broker) where.brokerName = filters.broker;
    if (filters.variety) where.variety = filters.variety;
    if (filters.party) where.partyName = { [Op.iLike]: `%${filters.party}%` };
    if (filters.location) where.location = { [Op.iLike]: `%${filters.location}%` };
    if (filters.status) where.workflowStatus = filters.status;
    if (filters.entryType) {
      where.entryType = filters.entryType;
    } else if (filters.excludeEntryType) {
      where.entryType = { [Op.ne]: filters.excludeEntryType };
    }

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const pageSize = Math.max(1, parseInt(filters.pageSize, 10) || 50);
    const paginationQuery = buildCursorQuery(filters, 'DESC', {
      fields: SAMPLE_ENTRY_CURSOR_FIELDS
    });
    const include = [
      { model: User, as: 'creator', attributes: ['id', 'username'] },
      {
        model: QualityParameters, as: 'qualityParameters', required: false,
        include: [{ model: User, as: 'reportedByUser', attributes: ['id', 'username'] }]
      },
      { model: User, as: 'lotSelectionByUser', attributes: ['id', 'username'] },
      { model: CookingReport, as: 'cookingReport', required: false },
      { model: SampleEntryOffering, as: 'offering', required: false },
      {
        model: LotAllotment, as: 'lotAllotment', required: false,
        include: [
          { model: User, as: 'supervisor', attributes: ['id', 'username'] },
          {
            model: PhysicalInspection, as: 'physicalInspections', required: false,
            include: [
              { model: User, as: 'reportedBy', attributes: ['id', 'username'] },
              {
                model: InventoryData, as: 'inventoryData', required: false,
                include: [
                  { model: User, as: 'recordedBy', attributes: ['id', 'username'] },
                  {
                    model: FinancialCalculation, as: 'financialCalculation', required: false,
                    include: [
                      { model: User, as: 'owner', attributes: ['id', 'username'] },
                      { model: User, as: 'manager', attributes: ['id', 'username'] }
                    ]
                  },
                  { model: Kunchinittu, as: 'kunchinittu', required: false, include: [{ model: Variety, as: 'variety', attributes: ['id', 'name'] }] },
                  { model: Outturn, as: 'outturn', required: false }
                ]
              }
            ]
          }
        ]
      }
    ];

    const result = await fetchHydratedSampleEntryPage({
      model: SampleEntry,
      baseWhere: where,
      paginationQuery,
      hydrateOptions: {
        include,
        subQuery: false
      },
      page,
      pageSize,
      countOnPageOneOnly: true
    });

    return {
      ...result,
      entries: result.entries.map((entry) => entry.toJSON())
    };
  }
}

module.exports = new SampleEntryRepository();
