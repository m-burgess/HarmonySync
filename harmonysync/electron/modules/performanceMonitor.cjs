const os = require('os');

/**
 * Performance Monitor Module
 * Collects and reports performance metrics
 */

/**
 * Get current performance metrics
 * @returns {Promise<object>} Performance metrics
 */
async function getMetrics() {
  try {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const cpuUsage = 100 - ~~(100 * totalIdle / totalTick);

    // Get process memory usage
    const processMemory = process.memoryUsage();

    return {
      success: true,
      metrics: {
        timestamp: Date.now(),
        cpu: {
          count: cpus.length,
          model: cpus[0]?.model || 'Unknown',
          usage_percent: cpuUsage
        },
        memory: {
          total_bytes: totalMem,
          used_bytes: usedMem,
          free_bytes: freeMem,
          usage_percent: Math.round((usedMem / totalMem) * 100)
        },
        process: {
          memory_rss: processMemory.rss,
          memory_heap_total: processMemory.heapTotal,
          memory_heap_used: processMemory.heapUsed,
          memory_external: processMemory.external,
          uptime_seconds: process.uptime()
        },
        system: {
          platform: os.platform(),
          arch: os.arch(),
          release: os.release(),
          hostname: os.hostname()
        }
      }
    };
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    throw error;
  }
}

module.exports = {
  getMetrics
};
