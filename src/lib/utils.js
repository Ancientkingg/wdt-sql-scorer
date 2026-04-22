/**
 * Check if a query is the "correct" reference answer.
 * A query counts as correct if it has 100 points and feedback containing "correct".
 * @param {Object} query
 * @returns {boolean}
 */
export function isCorrectQuery(query) {
    return query.originalPoints === 100 &&
        query.originalFeedback &&
        query.originalFeedback.toLowerCase().includes('correct');
}

/**
 * Compute the score for a query based on selected rubric reasons.
 * Starts at 100 and adds each reason's points (negative = deduction).
 * Clamped to [0, 100].
 * @param {Object} query
 * @param {Array} rubric
 * @returns {number}
 */
export function calculateQueryScore(query, rubric) {
    let score = 100;
    query.selectedReasons.forEach(reasonId => {
        const reason = rubric.find(r => r.id === reasonId);
        if (reason) {
            score += reason.points;
        }
    });
    return Math.max(0, Math.min(100, score));
}

/**
 * Syntax-highlight a SQL string for display.
 * Returns an HTML string with <span> tags for keywords, functions, strings, numbers.
 * Also reformats whitespace and injects line breaks before major clauses.
 * @param {string} sql
 * @returns {string} highlighted HTML
 */
export function highlightSQL(sql) {
    if (!sql) return '';

    sql = sql.trim();

    // Collapse whitespace
    sql = sql.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    // Add linebreaks before major SQL clauses. Handle JOIN variants together to avoid
    // splitting "LEFT JOIN" into separate lines when "JOIN" is processed later.
    const clauseBreakRegexes = [
        /\s+(FROM)\s+/gi,
        /\s+(WHERE)\s+/gi,
        /\s+(GROUP\s+BY)\s+/gi,
        /\s+(ORDER\s+BY)\s+/gi,
        /\s+(HAVING)\s+/gi,
        /\s+(LIMIT)\s+/gi,
        /\s+(OFFSET)\s+/gi,
        /\s+(UNION)\s+/gi,
        /\s+(INTERSECT)\s+/gi,
        /\s+(EXCEPT)\s+/gi,
        /\s+((?:INNER|LEFT|RIGHT|FULL|CROSS)\s+JOIN|JOIN)\s+/gi
    ];

    clauseBreakRegexes.forEach(regex => {
        sql = sql.replace(regex, '\n$1 ');
    });

    const keywords = [
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER',
        'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
        'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT', 'AS',
        'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE',
        'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ASC', 'DESC', 'UNION', 'ALL'
    ];

    const functions = [
        'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'CONCAT', 'SUBSTRING', 'UPPER', 'LOWER',
        'TRIM', 'LENGTH', 'ROUND', 'COALESCE', 'CAST', 'IFNULL', 'ISNULL'
    ];

    let highlighted = escapeHtml(sql);

    // Highlight keywords
    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        highlighted = highlighted.replace(regex, match =>
            `<span class="keyword">${match}</span>`
        );
    });

    // Highlight functions
    functions.forEach(func => {
        const regex = new RegExp(`\\b${func}(?=\\()`, 'gi');
        highlighted = highlighted.replace(regex, match =>
            `<span class="function">${match}</span>`
        );
    });

    // Highlight strings (single-quoted)
    highlighted = highlighted.replace(/'([^']*)'/g,
        "<span class='string'>'$1'</span>"
    );

    // Highlight numeric literals
    highlighted = highlighted.replace(/\b(\d+)\b/g,
        "<span class='number'>$1</span>"
    );

    return highlighted;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Extract reason IDs (R1, R2, etc.) from a feedback string.
 * @param {string} feedback
 * @returns {string[]}
 */
export function parseFeedbackToReasons(feedback) {
    if (!feedback) return [];
    const matches = feedback.match(/R\d+/g);
    return matches ? matches : [];
}

export const MODEL_QUERY_SENTINEL = '__MODEL_QUERY__';

/**
 * Parse cluster statistics from imported data.
 * Supports two formats:
 *  - Raw text with StatisticsCluster blocks (Count, query fields)
 *  - Pre-parsed queries array with clusterCount
 * @param {any} data
 * @returns {Map<string, number>} query text -> student count
 */
export function parseStatistics(data) {
    const queryCounts = new Map();

    if (data.statistics) {
        // Text format: split by cluster headers
        const clusters = data.statistics.split('StatisticsCluster').filter(c => c.trim());

        clusters.forEach(cluster => {
            const countMatch = cluster.match(/Count=\s*(\d+)/);
            const pointsMatch = cluster.match(/Points=\s*(-?\d+)/);
            const queryMatch = cluster.match(/query=\s*([\s\S]*)/);

            if (countMatch && queryMatch) {
                const count = parseInt(countMatch[1]);
                const points = pointsMatch ? parseInt(pointsMatch[1]) : null;
                const query = queryMatch[1].trim();

                if (query === 'This is a model query!') {
                    if (points === 100) {
                        queryCounts.set(MODEL_QUERY_SENTINEL, count);
                    } else {
                        // Students who literally submitted placeholder text as a wrong answer
                        queryCounts.set(normalizeQuery(query), count);
                    }
                } else if (query === 'Queries with errors!' || query === 'Empty result set!') {
                    // skip — no meaningful query to match against
                } else {
                    queryCounts.set(normalizeQuery(query), count);
                }
            } else if (countMatch && !queryMatch) {
                console.warn('parseStatistics: failed to parse query block in cluster', cluster);
            }
        });
    } else if (data.queries && data.queries.length > 0 && data.queries[0].clusterCount !== undefined) {
        // Already has cluster counts embedded in queries
        data.queries.forEach(q => {
            if (q.query && q.clusterCount !== undefined) {
                const normalizedQuery = normalizeQuery(q.query.trim());
                queryCounts.set(normalizedQuery, q.clusterCount);
            }
        });
    }

    return queryCounts;
}

/**
 * Normalize a query string for fuzzy matching (trim + collapse whitespace).
 * @param {string} query
 * @returns {string}
 */
export function normalizeQuery(query) {
    return query
        .replace(/--[^\n]*/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')')
        .replace(/;$/, '');
}
