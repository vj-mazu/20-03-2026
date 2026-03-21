const { sequelize } = require('../config/database');
const Outturn = require('../models/Outturn');

/**
 * Rice Stock Variety Analysis Service
 * 
 * Analyzes existing free-text varieties in rice_stock_movements and maps them
 * to existing outturns using fuzzy matching for migration purposes.
 * 
 * This service ONLY affects rice stock operations (Purchase, Sale, Palti).
 * It does NOT modify arrivals, hamali, location, or other systems.
 */
class RiceStockVarietyAnalysisService {
  
  /**
   * Analyze all unique varieties in rice_stock_movements table
   * @returns {Promise<Object>} Analysis results with mapping suggestions
   */
  async analyzeRiceStockVarieties() {
    console.log('🔍 Starting rice stock variety analysis...');
    
    try {
      // Get all unique varieties from rice_stock_movements (excluding those already mapped)
      const [uniqueVarieties] = await sequelize.query(`
        SELECT 
          TRIM(UPPER(variety)) as variety,
          COUNT(*) as usage_count,
          MIN(date) as first_used,
          MAX(date) as last_used,
          ARRAY_AGG(DISTINCT movement_type) as movement_types,
          ARRAY_AGG(DISTINCT product_type) as product_types
        FROM rice_stock_movements 
        WHERE variety IS NOT NULL 
          AND variety != ''
          AND outturn_id IS NULL  -- Only analyze unmapped varieties
          AND status = 'approved'
        GROUP BY TRIM(UPPER(variety))
        ORDER BY usage_count DESC, variety
      `);

      console.log(`📊 Found ${uniqueVarieties.length} unique unmapped rice stock varieties`);

      // Get all available outturns for matching
      const availableOutturns = await Outturn.findAll({
        attributes: ['id', 'code', 'allottedVariety', 'type', 'createdAt'],
        order: [['createdAt', 'DESC']]
      });

      console.log(`🎯 Found ${availableOutturns.length} available outturns for matching`);

      // Analyze each variety and find potential matches
      const analysisResults = [];
      
      for (const varietyData of uniqueVarieties) {
        const variety = varietyData.variety;
        const matches = this.findPotentialMatches(variety, availableOutturns);
        
        analysisResults.push({
          originalVariety: variety,
          usageCount: varietyData.usage_count,
          firstUsed: varietyData.first_used,
          lastUsed: varietyData.last_used,
          movementTypes: varietyData.movement_types,
          productTypes: varietyData.product_types,
          potentialMatches: matches,
          recommendedAction: this.getRecommendedAction(matches),
          confidence: this.calculateConfidence(matches)
        });
      }

      // Generate summary statistics
      const summary = this.generateAnalysisSummary(analysisResults);
      
      console.log('✅ Rice stock variety analysis completed');
      console.log(`📈 Summary: ${summary.totalVarieties} varieties, ${summary.exactMatches} exact matches, ${summary.fuzzyMatches} fuzzy matches, ${summary.noMatches} need new outturns`);

      return {
        timestamp: new Date(),
        summary,
        varieties: analysisResults,
        availableOutturns: availableOutturns.map(o => ({
          id: o.id,
          code: o.code,
          standardizedVariety: `${o.allottedVariety} ${o.type}`.toUpperCase().trim()
        }))
      };

    } catch (error) {
      console.error('❌ Error analyzing rice stock varieties:', error);
      throw error;
    }
  }

  /**
   * Find potential outturn matches for a given variety string
   * @param {string} variety - The variety string to match
   * @param {Array} outturns - Available outturns
   * @returns {Array} Array of potential matches with confidence scores
   */
  findPotentialMatches(variety, outturns) {
    const matches = [];
    const cleanVariety = variety.toUpperCase().trim();

    for (const outturn of outturns) {
      const standardizedOutturn = `${outturn.allottedVariety} ${outturn.type}`.toUpperCase().trim();
      
      // Exact match
      if (cleanVariety === standardizedOutturn) {
        matches.push({
          outturnId: outturn.id,
          outturnCode: outturn.code,
          standardizedVariety: standardizedOutturn,
          matchType: 'exact',
          confidence: 1.0,
          reason: 'Exact string match'
        });
        continue;
      }

      // Fuzzy matching strategies
      const fuzzyMatches = this.performFuzzyMatching(cleanVariety, outturn, standardizedOutturn);
      matches.push(...fuzzyMatches);
    }

    // Sort by confidence score (highest first) and limit to top 3
    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  /**
   * Perform fuzzy matching between variety and outturn
   * @param {string} variety - Clean variety string
   * @param {Object} outturn - Outturn object
   * @param {string} standardizedOutturn - Standardized outturn variety
   * @returns {Array} Array of fuzzy matches
   */
  performFuzzyMatching(variety, outturn, standardizedOutturn) {
    const matches = [];
    const allottedVariety = outturn.allottedVariety.toUpperCase().trim();

    // Match on allotted variety only (ignoring type)
    if (variety.includes(allottedVariety) || allottedVariety.includes(variety)) {
      const confidence = this.calculateSimilarity(variety, allottedVariety);
      if (confidence > 0.7) {
        matches.push({
          outturnId: outturn.id,
          outturnCode: outturn.code,
          standardizedVariety: standardizedOutturn,
          matchType: 'variety_partial',
          confidence: confidence * 0.9, // Slightly lower confidence for partial matches
          reason: `Partial match on variety: "${allottedVariety}"`
        });
      }
    }

    // Match with common abbreviations and variations
    const abbreviationMatches = this.matchAbbreviations(variety, standardizedOutturn);
    if (abbreviationMatches.length > 0) {
      matches.push(...abbreviationMatches.map(match => ({
        outturnId: outturn.id,
        outturnCode: outturn.code,
        standardizedVariety: standardizedOutturn,
        matchType: 'abbreviation',
        confidence: match.confidence * 0.8,
        reason: match.reason
      })));
    }

    return matches;
  }

  /**
   * Match common abbreviations and variations
   * @param {string} variety - Variety string
   * @param {string} standardizedOutturn - Standardized outturn
   * @returns {Array} Abbreviation matches
   */
  matchAbbreviations(variety, standardizedOutturn) {
    const matches = [];
    
    // Common abbreviation patterns
    const abbreviations = {
      'BASMATI': ['BSM', 'BASM'],
      'SONA': ['SONA', 'P SONA', 'PSONA'],
      'RNR': ['RNR', 'R N R'],
      'JSR': ['JSR', 'J S R'],
      'RAW': ['RAW', 'R'],
      'STEAM': ['STEAM', 'STM', 'S']
    };

    for (const [fullForm, abbrevs] of Object.entries(abbreviations)) {
      if (standardizedOutturn.includes(fullForm)) {
        for (const abbrev of abbrevs) {
          if (variety.includes(abbrev)) {
            matches.push({
              confidence: 0.8,
              reason: `Abbreviation match: "${abbrev}" → "${fullForm}"`
            });
          }
        }
      }
    }

    return matches;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Get recommended action based on matches
   * @param {Array} matches - Potential matches
   * @returns {string} Recommended action
   */
  getRecommendedAction(matches) {
    if (matches.length === 0) {
      return 'create_new_outturn';
    }
    
    const bestMatch = matches[0];
    if (bestMatch.confidence >= 0.95) {
      return 'auto_map';
    } else if (bestMatch.confidence >= 0.8) {
      return 'review_and_map';
    } else {
      return 'manual_review';
    }
  }

  /**
   * Calculate overall confidence for a variety
   * @param {Array} matches - Potential matches
   * @returns {number} Confidence score
   */
  calculateConfidence(matches) {
    if (matches.length === 0) return 0;
    return matches[0].confidence;
  }

  /**
   * Generate analysis summary
   * @param {Array} results - Analysis results
   * @returns {Object} Summary statistics
   */
  generateAnalysisSummary(results) {
    const summary = {
      totalVarieties: results.length,
      exactMatches: 0,
      fuzzyMatches: 0,
      noMatches: 0,
      autoMappable: 0,
      needsReview: 0,
      needsManualReview: 0,
      needsNewOutturn: 0,
      totalUsageCount: 0
    };

    for (const result of results) {
      summary.totalUsageCount += result.usageCount;
      
      if (result.potentialMatches.length === 0) {
        summary.noMatches++;
      } else {
        const bestMatch = result.potentialMatches[0];
        if (bestMatch.matchType === 'exact') {
          summary.exactMatches++;
        } else {
          summary.fuzzyMatches++;
        }
      }

      switch (result.recommendedAction) {
        case 'auto_map':
          summary.autoMappable++;
          break;
        case 'review_and_map':
          summary.needsReview++;
          break;
        case 'manual_review':
          summary.needsManualReview++;
          break;
        case 'create_new_outturn':
          summary.needsNewOutturn++;
          break;
      }
    }

    return summary;
  }

  /**
   * Get varieties that can be automatically mapped
   * @param {Object} analysisResults - Results from analyzeRiceStockVarieties
   * @returns {Array} Varieties suitable for automatic mapping
   */
  getAutoMappableVarieties(analysisResults) {
    return analysisResults.varieties.filter(v => 
      v.recommendedAction === 'auto_map' && 
      v.confidence >= 0.95
    );
  }

  /**
   * Get varieties that need manual review
   * @param {Object} analysisResults - Results from analyzeRiceStockVarieties
   * @returns {Array} Varieties needing manual review
   */
  getVarietiesNeedingReview(analysisResults) {
    return analysisResults.varieties.filter(v => 
      ['review_and_map', 'manual_review'].includes(v.recommendedAction)
    );
  }

  /**
   * Get varieties that need new outturns created
   * @param {Object} analysisResults - Results from analyzeRiceStockVarieties
   * @returns {Array} Varieties needing new outturns
   */
  getVarietiesNeedingNewOutturns(analysisResults) {
    return analysisResults.varieties.filter(v => 
      v.recommendedAction === 'create_new_outturn'
    );
  }
}

module.exports = new RiceStockVarietyAnalysisService();