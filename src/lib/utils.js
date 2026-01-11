export function isCorrectQuery(query) {
    return query.originalPoints === 100 &&
        query.originalFeedback &&
        query.originalFeedback.toLowerCase().includes('correct');
}

export function calculateQueryScore(query, rubric) {
    let score = 100;
    query.selectedReasons.forEach(reasonId => {
        const reason = rubric.find(r => r.id === reasonId);
        if (reason) {
            score -= reason.points;
        }
    });
    return Math.max(0, score);
}

export function highlightSQL(sql) {
    if (!sql) return '';

    // Trim leading and trailing whitespace
    sql = sql.trim();

    // Remove line breaks and collapse multiple spaces into single spaces
    sql = sql.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    // Add linebreaks before major SQL keywords for better readability
    const linebreakKeywords = [
        'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
        'UNION', 'INTERSECT', 'EXCEPT', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN',
        'FULL JOIN', 'CROSS JOIN', 'JOIN'
    ];

    // Sort by length descending to match longer phrases first
    linebreakKeywords.sort((a, b) => b.length - a.length);

    linebreakKeywords.forEach(keyword => {
        const regex = new RegExp(`\\s+(${keyword})\\s+`, 'gi');
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

    // Highlight strings
    highlighted = highlighted.replace(/'([^']*)'/g,
        "<span class='string'>'$1'</span>"
    );

    // Highlight numbers
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

export function parseFeedbackToReasons(feedback) {
    if (!feedback) return [];
    const matches = feedback.match(/R\d+/g);
    return matches ? matches : [];
}
