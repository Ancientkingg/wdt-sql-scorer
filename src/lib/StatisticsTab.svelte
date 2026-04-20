<script>
	import { calculateQueryScore } from './utils.js';

	export let assignment;

	// Calculate statistics
	function calculateStatistics() {
		if (!assignment.queries || assignment.queries.length === 0) {
			return null;
		}

		const scores = assignment.queries.map(q => calculateQueryScore(q, assignment.rubric));
		const n = scores.length;

		// Average
		const average = scores.reduce((sum, score) => sum + score, 0) / n;

		// Standard deviation
		const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / n;
		const stdDev = Math.sqrt(variance);

		// Min and Max
		const min = Math.min(...scores);
		const max = Math.max(...scores);

		// Median
		const sortedScores = [...scores].sort((a, b) => a - b);
		const median = n % 2 === 0
			? (sortedScores[n / 2 - 1] + sortedScores[n / 2]) / 2
			: sortedScores[Math.floor(n / 2)];

		// Distribution by 10-point buckets (0-10, 11-20, ..., 91-100)
		const buckets = Array(10).fill(0);
		scores.forEach(score => {
			const bucketIndex = Math.min(Math.floor(score / 10), 9);
			buckets[bucketIndex]++;
		});

		// Cumulative distribution
		const cumulative = [];
		let cumSum = 0;
		for (let i = 0; i < buckets.length; i++) {
			cumSum += buckets[i];
			cumulative.push(cumSum);
		}

		// Student-weighted statistics if available
		let studentWeightedStats = null;
		if (assignment.hasStatistics) {
			const studentScores = [];
			assignment.queries.forEach(q => {
				const score = calculateQueryScore(q, assignment.rubric);
				const count = q.clusterCount || 1;
				for (let i = 0; i < count; i++) {
					studentScores.push(score);
				}
			});

			const studentN = studentScores.length;
			const studentAverage = studentScores.reduce((sum, s) => sum + s, 0) / studentN;
			const studentVariance = studentScores.reduce((sum, s) => sum + Math.pow(s - studentAverage, 2), 0) / studentN;
			const studentStdDev = Math.sqrt(studentVariance);

			const studentBuckets = Array(10).fill(0);
			studentScores.forEach(score => {
				const bucketIndex = Math.min(Math.floor(score / 10), 9);
				studentBuckets[bucketIndex]++;
			});

			const studentCumulative = [];
			let studentCumSum = 0;
			for (let i = 0; i < studentBuckets.length; i++) {
				studentCumSum += studentBuckets[i];
				studentCumulative.push(studentCumSum);
			}

			studentWeightedStats = {
				count: studentN,
				average: studentAverage,
				stdDev: studentStdDev,
				buckets: studentBuckets,
				cumulative: studentCumulative
			};
		}

		return {
			count: n,
			average,
			stdDev,
			min,
			max,
			median,
			buckets,
			cumulative,
			studentWeighted: studentWeightedStats
		};
	}

	$: stats = calculateStatistics();
	$: maxBucketCount = stats ? Math.max(...stats.buckets, ...(stats.studentWeighted?.buckets || [])) : 0;
	
	let viewMode = 'students'; // 'queries' or 'students'
	
	$: displayStats = viewMode === 'students' && stats?.studentWeighted 
		? {
			count: stats.studentWeighted.count,
			average: stats.studentWeighted.average,
			stdDev: stats.studentWeighted.stdDev,
			buckets: stats.studentWeighted.buckets,
			cumulative: stats.studentWeighted.cumulative,
			// Keep min, max, median from query stats as they represent the range
			min: stats.min,
			max: stats.max,
			median: stats.median
		}
		: stats;
</script>

<div class="tab-content active">
	<div class="statistics-container">
		{#if !stats}
			<div class="empty-state">
				<p>No queries available to calculate statistics.</p>
			</div>
		{:else}
			<div class="stats-section">
				<h2>Grade Statistics</h2>
				
				<div class="view-toggle">
					<span class="toggle-label">View:</span>
					{#if assignment.hasStatistics}
						<label class="toggle-option">
						<input type="radio" name="view" value="queries" bind:group={viewMode} />
						<span>By Unique Queries ({stats.count})</span>
					</label>
					<label class="toggle-option">
						<input type="radio" name="view" value="students" bind:group={viewMode} />
							<span>By Students ({stats.studentWeighted.count})</span>
						</label>
					{:else}
						<span class="info-text">Showing {stats.count} unique queries</span>
					{/if}
				</div>

				<div class="stats-grid">
					<div class="stat-card">
						<div class="stat-label">Average</div>
					<div class="stat-value">{displayStats.average.toFixed(2)}</div>
					</div>
					<div class="stat-card">
						<div class="stat-label">Std. Deviation</div>
					<div class="stat-value">{displayStats.stdDev.toFixed(2)}</div>
					</div>
					<div class="stat-card">
						<div class="stat-label">Median</div>
					<div class="stat-value">{displayStats.median.toFixed(2)}</div>
					</div>
					<div class="stat-card">
						<div class="stat-label">Min</div>
					<div class="stat-value">{displayStats.min}</div>
					</div>
					<div class="stat-card">
						<div class="stat-label">Max</div>
					<div class="stat-value">{displayStats.max}</div>
					</div>
					<div class="stat-card">
						<div class="stat-label">Total</div>
					<div class="stat-value">{displayStats.count}</div>
					</div>
				</div>
			</div>

			<div class="stats-section">
				<h3>Performance Distribution</h3>
				<div class="chart-container">
					<div class="chart-histogram-wrapper">
						<div class="histogram-y-label">Number of {viewMode === 'students' ? 'Students' : 'Queries'}</div>
						<div class="chart-histogram">
							{#each displayStats.buckets as count, i}
								{@const percentage = maxBucketCount > 0 ? (count / maxBucketCount) * 100 : 0}
								<div class="histogram-bar-group">
									<div class="histogram-bar" class:student-bar={viewMode === 'students'} style="height: {percentage}%">
										<span class="bar-label">{count}</span>
									</div>
									<div class="histogram-label">{i * 10}-{i * 10 + 9}</div>
								</div>
							{/each}
						</div>
						<div class="histogram-x-label">Grade</div>
					</div>
				</div>
			</div>

			<div class="stats-section">
				<h3>Cumulative Distribution</h3>
				<div class="chart-container">
					<div class="chart-cumulative">
						<svg viewBox="0 0 520 280" class="cumulative-svg" preserveAspectRatio="xMidYMid meet">
							<!-- Background grid lines -->
							{#each [0, 25, 50, 75, 100] as percent}
								<line 
									x1="80" 
									y1={240 - (percent * 2)} 
									x2="490" 
									y2={240 - (percent * 2)} 
									stroke="var(--border-color)" 
									stroke-width="1" 
									opacity="0.3"
								/>
							{/each}

							<!-- Y-axis labels -->
							{#each [0, 25, 50, 75, 100] as percent}
								<text 
									x="68" 
									y={244 - (percent * 2)} 
									text-anchor="end" 
									font-size="12" 
									fill="var(--text-secondary)"
								>
									{Math.round(percent * displayStats.count / 100)}
								</text>
							{/each}

							<!-- Filled area under curve -->
							<polygon
								points={`80,240 ${displayStats.cumulative.map((count, i) => {
									const x = 80 + (i * 41);
									const y = 240 - (count / displayStats.count * 200);
									return `${x},${y}`;
								}).join(' ')} ${80 + ((displayStats.cumulative.length - 1) * 41)},240`}
								fill={viewMode === 'students' ? 'var(--success-color)' : 'var(--primary-color)'}
								opacity="0.2"
							/>

							<!-- Cumulative line -->
							<polyline
								points={displayStats.cumulative.map((count, i) => {
									const x = 80 + (i * 41);
									const y = 240 - (count / displayStats.count * 200);
									return `${x},${y}`;
								}).join(' ')}
								fill="none"
								stroke={viewMode === 'students' ? 'var(--success-color)' : 'var(--primary-color)'}
								stroke-width="3"
							/>

							<!-- Points on line -->
							{#each displayStats.cumulative as count, i}
								{@const x = 80 + (i * 41)}
								{@const y = 240 - (count / displayStats.count * 200)}
								<circle 
									cx={x} 
									cy={y} 
									r="4.5" 
									fill={viewMode === 'students' ? 'var(--success-color)' : 'var(--primary-color)'}
									stroke="var(--bg-secondary)"
									stroke-width="2"
								/>
							{/each}

							<!-- X-axis -->
							<line x1="80" y1="240" x2="490" y2="240" stroke="var(--text-secondary)" stroke-width="2" />
							<!-- Y-axis -->
							<line x1="80" y1="40" x2="80" y2="240" stroke="var(--text-secondary)" stroke-width="2" />

							<!-- X-axis labels -->
							{#each displayStats.buckets as _, i}
								<text 
									x={80 + (i * 41)} 
									y="256" 
									text-anchor="middle" 
									font-size="11" 
									fill="var(--text-secondary)"
								>
									{i * 10}
								</text>
							{/each}

							<!-- X-axis title -->
							<text x="285" y="274" text-anchor="middle" font-size="14" font-weight="600" fill="var(--text-primary)">
								Grade
							</text>
							
							<!-- Y-axis title -->
							<text 
								x="20" 
								y="140" 
								text-anchor="middle" 
								font-size="14" 
								font-weight="600" 
								fill="var(--text-primary)" 
								transform="rotate(-90 20 140)"
							>
								Number of {viewMode === 'students' ? 'Students' : 'Queries'}
							</text>
						</svg>
					</div>
				</div>
			</div>

			{#if stats.studentWeighted}
				<div class="stats-section">
					<h3>Student-Weighted Statistics</h3>
					<p class="info-text">Statistics weighted by the number of students per unique query (from cluster data).</p>
					
					<div class="stats-grid">
						<div class="stat-card">
							<div class="stat-label">Average</div>
							<div class="stat-value">{stats.studentWeighted.average.toFixed(2)}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">Std. Deviation</div>
							<div class="stat-value">{stats.studentWeighted.stdDev.toFixed(2)}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">Total Students</div>
							<div class="stat-value">{stats.studentWeighted.count}</div>
						</div>
					</div>

					<h4>Student Performance Distribution</h4>
					<div class="chart-container">
						<div class="chart-histogram">
							{#each stats.studentWeighted.buckets as count, i}
								{@const percentage = maxBucketCount > 0 ? (count / maxBucketCount) * 100 : 0}
								<div class="histogram-bar-group">
									<div class="histogram-bar student-bar" style="height: {percentage}%">
										<span class="bar-label">{count}</span>
									</div>
									<div class="histogram-label">{i * 10}-{(i + 1) * 10 - 1}</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.statistics-container {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.stats-section {
		margin-bottom: 3rem;
	}

	.stats-section h2 {
		margin-bottom: 1.5rem;
		color: var(--text-primary);
	}

	.stats-section h3 {
		margin-bottom: 1rem;
		color: var(--text-primary);
		font-size: 1.25rem;
	}

	.stats-section h4 {
		margin-top: 2rem;
		margin-bottom: 1rem;
		color: var(--text-primary);
		font-size: 1.1rem;
	}

	.view-toggle {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.toggle-label {
		font-weight: 600;
		color: var(--text-secondary);
	}

	.toggle-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		background: var(--bg-secondary);
		transition: all 0.2s ease;
	}

	.toggle-option:hover {
		background: var(--bg-hover);
	}

	.toggle-option input[type="radio"] {
		cursor: pointer;
	}

	.info-text {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: var(--bg-secondary);
		padding: 1.5rem;
		border-radius: 8px;
		border: 1px solid var(--border-color);
		text-align: center;
	}

	.stat-label {
		color: var(--text-secondary);
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
		font-weight: 500;
	}

	.stat-value {
		color: var(--text-primary);
		font-size: 2rem;
		font-weight: 700;
	}

	.chart-container {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 1rem;
	}

	.chart-histogram-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.histogram-y-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
		align-self: flex-start;
		margin-left: 2rem;
	}

	.histogram-x-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
		margin-top: 0.25rem;
	}

	.chart-histogram {
		display: flex;
		align-items: flex-end;
		justify-content: space-around;
		height: 250px;
		width: 100%;
		gap: 0.5rem;
		border-bottom: 2px solid var(--text-secondary);
		border-left: 2px solid var(--text-secondary);
		padding-bottom: 0;
		padding-left: 1rem;
	}

	.histogram-bar-group {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		height: 100%;
		position: relative;
	}

	.histogram-bar {
		width: 100%;
		max-width: 60px;
		background: var(--primary-color);
		border-radius: 4px 4px 0 0;
		min-height: 2px;
		position: relative;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		transition: all 0.3s ease;
		margin-bottom: 0;
	}

	.histogram-bar.student-bar {
		background: var(--success-color);
	}

	.histogram-bar:hover {
		opacity: 0.8;
	}

	.bar-label {
		position: absolute;
		top: -20px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.histogram-label {
		position: absolute;
		bottom: -25px;
		font-size: 0.75rem;
		color: var(--text-secondary);
		text-align: center;
		white-space: nowrap;
	}

	.chart-cumulative {
		height: 320px;
	}

	.cumulative-svg {
		width: 100%;
		height: 100%;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: var(--text-secondary);
	}

	@media (max-width: 768px) {
		.statistics-container {
			padding: 1rem;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.stat-value {
			font-size: 1.5rem;
		}

		.chart-histogram {
			height: 200px;
		}
	}
</style>
