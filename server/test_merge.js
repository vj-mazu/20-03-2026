const { Op } = require('sequelize');

function mergeWhereClauses(...clauses) {
  const filtered = clauses.filter((clause) => clause && Object.keys(clause).length > 0);
  if (filtered.length === 0) return {};
  if (filtered.length === 1) return filtered[0];
  return { [Op.and]: filtered };
}

let where = {};
where[Op.and] = [ { status: 'LOCATION_SAMPLE' } ];

let staffVisibilityClause = {
  [Op.or]: [ { privacy: 'test' } ]
};

let baseWhere = mergeWhereClauses(where, staffVisibilityClause);
console.log('BASE WHERE:', JSON.stringify(baseWhere, Object.getOwnPropertySymbols(baseWhere).map(s => s.toString())));
// Since JSON.stringify ignores Symbols, let's use util.inspect
const util = require('util');
console.log(util.inspect(baseWhere, { depth: null }));

let paginationQueryWhere = {};
let finalWhere = mergeWhereClauses(baseWhere, paginationQueryWhere);
console.log('FINAL WHERE:', util.inspect(finalWhere, { depth: null }));
