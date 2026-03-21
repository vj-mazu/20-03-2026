const { Sequelize } = require('sequelize');
const SampleEntryService = require('./server/services/SampleEntryService');
const SampleEntryRepository = require('./server/repositories/SampleEntryRepository');
const historyUtil = require('./server/utils/historyUtil');

async function test() {
  try {
    const fakeReq = {
      query: { status: 'RESAMPLE_COOKING_BOOK' },
      user: { role: 'admin', userId: 1 }
    };
    
    const result = await SampleEntryService.getSampleEntries(fakeReq);
    console.log(`Filter says ${result.entries.length} entries matching RESAMPLE_COOKING_BOOK`);
    
    // Now let's manually fetch the raw DB payload to see what's being filtered out
    const filters = { status: 'RESAMPLE_COOKING_BOOK' };
    const rawResult = await SampleEntryRepository.findByRoleAndFilters('admin', filters, 1);
    const hydratedRows = await historyUtil.attachLoadingLotsHistories(rawResult.entries);
    
    console.log(`Raw Repository fetched: ${hydratedRows.length}`);
    
    hydratedRows.forEach(entry => {
       console.log('--- Entry ID:', entry.id);
       console.log('WorkflowStatus:', entry.workflowStatus);
       console.log('LotSelectionDecision:', entry.lotSelectionDecision);
       console.log('resampleStartAt:', entry.resampleStartAt);
       console.log('qualityReportAttempts:', entry.qualityReportAttempts);
       console.log('qualityAttemptDetails:', entry.qualityAttemptDetails?.length);
       
       const SampleServiceMethodsMock = {
          toTimeValue: (val) => {
            if (!val) return 0;
            const t = new Date(val).getTime();
            return Number.isFinite(t) ? t : 0;
          },
          getResampleBoundaryTime: (e) => {
            const explicitBoundary = SampleServiceMethodsMock.toTimeValue(e.resampleStartAt || null);
            if (explicitBoundary) return explicitBoundary;
            if (String(e.lotSelectionDecision || '').toUpperCase() === 'FAIL') {
              return SampleServiceMethodsMock.toTimeValue(e.lotSelectionAt || null);
            }
            return 0;
          },
          isResampleWorkflowEntry: (e) => {
            const decision = String(e.lotSelectionDecision || '').toUpperCase();
            return decision === 'FAIL' || SampleServiceMethodsMock.getResampleBoundaryTime(e) > 0 || (decision === 'PASS_WITH_COOKING' && Number(e.qualityReportAttempts || 0) > 1);
          },
          hasQualitySnapshot: (qp) => {
            if (!qp) return false;
            return true; // Simplified for test
          },
          hasPostResampleAttempt: (e) => {
            const attempts = Array.isArray(e.qualityAttemptDetails) ? e.qualityAttemptDetails : [];
            const boundary = SampleServiceMethodsMock.getResampleBoundaryTime(e);
            if (!boundary) return attempts.length > 1;
            return attempts.some(a => {
               const actTime = SampleServiceMethodsMock.toTimeValue(a.updatedAt || a.createdAt || null);
               return actTime >= boundary;
            });
          }
       };
       
       const isResample = SampleServiceMethodsMock.isResampleWorkflowEntry(entry);
       const boundary = SampleServiceMethodsMock.getResampleBoundaryTime(entry);
       const qTime = SampleServiceMethodsMock.toTimeValue(entry.qualityParameters?.updatedAt || entry.qualityParameters?.createdAt);
       const cReady = boundary ? qTime >= boundary : Number(entry.qualityReportAttempts || 0) > 1;
       const postReady = SampleServiceMethodsMock.hasPostResampleAttempt(entry);
       
       console.log('isResampleWorkflowEntry:', isResample);
       console.log('boundary:', new Date(boundary));
       console.log('qualityTime:', new Date(qTime));
       console.log('cReady:', cReady);
       console.log('postReady:', postReady);
       console.log('FINAL FILTER:', postReady || cReady);
    });

  } catch (err) {
    console.error(err);
  }
}

test().catch(console.error).finally(() => process.exit(0));
