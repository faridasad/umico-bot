// src/services/scheduler.ts - Fixed implementation

import { ProductsService } from "../products/service";


interface ScheduleInfo {
  id: string;
  interval: number; // interval in minutes
  isActive: boolean;
  lastRunTime: Date | null;
  nextRunTime: Date | null;
  adjustment: number; // price adjustment amount
  action: 'increase' | 'decrease'; // direction of price change
  isCurrentlyExecuting: boolean; // Flag to prevent concurrent executions
}

class SchedulerService {
  private schedules: Map<string, ScheduleInfo> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  
  // Create or update a schedule
  createSchedule(
    id: string, 
    interval: number, 
    adjustment: number, 
    action: 'increase' | 'decrease',
    runImmediately: boolean = true
  ): ScheduleInfo {
    this.log(`Creating schedule [${id}]`, {
      interval,
      adjustment,
      action,
      runImmediately
    });
    
    // If there's an existing active schedule, stop it first
    if (this.schedules.has(id)) {
      this.stopSchedule(id);
    }
    
    // Create schedule info - nextRunTime is null until first execution completes
    const schedule: ScheduleInfo = {
      id,
      interval,
      isActive: true,
      lastRunTime: null,
      nextRunTime: null,
      adjustment,
      action,
      isCurrentlyExecuting: false
    };
    
    // Store the schedule
    this.schedules.set(id, schedule);
    
    // Run immediately if requested
    if (runImmediately) {
      this.log(`Triggering immediate execution for schedule [${id}]`);
      
      // Execute immediately but don't await - let it run asynchronously
      this.executeSchedule(id);
    } else {
      // If not running immediately, set the next runtime manually
      const now = new Date();
      schedule.nextRunTime = new Date(now.getTime() + interval * 60 * 1000);
      this.schedules.set(id, schedule);
      
      this.log(`Schedule [${id}] created without immediate execution`, {
        nextRunTime: schedule.nextRunTime.toISOString()
      });
      
      // Schedule the first execution
      this.scheduleNext(id);
    }
    
    return { ...schedule }; // Return a copy of the schedule
  }
  
  // Stop a schedule
  stopSchedule(id: string): boolean {
    this.log(`Attempting to stop schedule [${id}]`);
    
    const schedule = this.schedules.get(id);
    if (!schedule) {
      this.log(`No schedule found with id [${id}]`);
      return false;
    }
    
    // Update schedule status
    schedule.isActive = false;
    this.schedules.set(id, schedule);
    
    // Clear any pending timers
    if (this.timers.has(id)) {
      this.log(`Clearing timer for schedule [${id}]`);
      clearTimeout(this.timers.get(id)!);
      this.timers.delete(id);
    }
    
    this.log(`Successfully stopped schedule [${id}]`);
    return true;
  }
  
  // Get schedule status
  getSchedule(id: string): ScheduleInfo | null {
    const schedule = this.schedules.get(id);
    if (!schedule) return null;
    
    // Return a copy to prevent external modification
    return { ...schedule };
  }
  
  // Get all schedules
  getAllSchedules(): ScheduleInfo[] {
    return Array.from(this.schedules.values()).map(schedule => ({ ...schedule }));
  }
  
  // Execute a scheduled task
  private async executeSchedule(id: string): Promise<void> {
    const now = new Date();
    const schedule = this.schedules.get(id);
    
    if (!schedule || !schedule.isActive) {
      this.log(`Schedule [${id}] not found or not active, skipping execution`);
      return;
    }
    
    // Check if already executing
    if (schedule.isCurrentlyExecuting) {
      this.log(`Schedule [${id}] is already executing, skipping this invocation`);
      return;
    }
    
    // Mark as executing
    schedule.isCurrentlyExecuting = true;
    this.schedules.set(id, schedule);
    
    this.log(`Starting execution of schedule [${id}] at ${now.toISOString()}`);
    
    try {
      // Determine final adjustment value based on action
      const finalAdjustment = schedule.action === 'increase' 
        ? Math.abs(schedule.adjustment) 
        : -Math.abs(schedule.adjustment);
      
      this.log(`Executing bulk price update with adjustment ${finalAdjustment}`);
      
      // Execute the price update
      const startTime = Date.now();
      const result = await ProductsService.bulkUpdatePrices(finalAdjustment);
      const endTime = Date.now();
      
      this.log(`Bulk update complete: ${result.success} successful, ${result.failed} failed. Took ${endTime - startTime}ms`);
      
      // Get the schedule again to make sure it's still active
      const updatedSchedule = this.schedules.get(id);
      if (!updatedSchedule || !updatedSchedule.isActive) {
        this.log(`Schedule [${id}] was stopped during execution, not scheduling next run`);
        return;
      }
      
      // Update last run time - use the current time after execution completed
      const completionTime = new Date();
      updatedSchedule.lastRunTime = completionTime;
      
      // Calculate next run time - AFTER current execution completes
      updatedSchedule.nextRunTime = new Date(completionTime.getTime() + (updatedSchedule.interval * 60 * 1000));
      
      // Mark as no longer executing
      updatedSchedule.isCurrentlyExecuting = false;
      
      this.log(`Updated schedule [${id}] timing after execution`, {
        lastRunTime: updatedSchedule.lastRunTime.toISOString(),
        nextRunTime: updatedSchedule.nextRunTime.toISOString(),
        interval: `${updatedSchedule.interval} minutes`
      });
      
      // Update the schedule in the map
      this.schedules.set(id, updatedSchedule);
      
      // Schedule the next execution
      this.scheduleNext(id);
    } catch (error) {
      this.log(`Error executing schedule [${id}]:`, error);
      
      // Get the schedule again to make sure it's still active
      const updatedSchedule = this.schedules.get(id);
      if (!updatedSchedule) return;
      
      // Mark as no longer executing even if there was an error
      updatedSchedule.isCurrentlyExecuting = false;
      
      // Still set next run time if active
      if (updatedSchedule.isActive) {
        const errorTime = new Date();
        updatedSchedule.lastRunTime = errorTime;
        updatedSchedule.nextRunTime = new Date(errorTime.getTime() + (updatedSchedule.interval * 60 * 1000));
        
        this.log(`Scheduling next execution despite error: ${updatedSchedule.nextRunTime.toISOString()}`);
        
        this.schedules.set(id, updatedSchedule);
        this.scheduleNext(id);
      }
    }
  }
  
  // Schedule the next execution
  private scheduleNext(id: string): void {
    const schedule = this.schedules.get(id);
    if (!schedule || !schedule.isActive || !schedule.nextRunTime) {
      this.log(`Cannot schedule next execution for [${id}]: Invalid schedule state`);
      return;
    }
    
    // Clear any existing timer for this schedule
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id)!);
      this.timers.delete(id);
    }
    
    const now = new Date();
    const delay = Math.max(0, schedule.nextRunTime.getTime() - now.getTime());
    
    this.log(`Scheduling next execution for [${id}]`, {
      currentTime: now.toISOString(),
      nextRunTime: schedule.nextRunTime.toISOString(),
      delay: `${Math.round(delay / 1000)} seconds (${Math.round(delay / 1000 / 60)} minutes)`
    });
    
    // Create a timer for the next execution
    const timer = setTimeout(() => {
      this.log(`Timer triggered for schedule [${id}]`);
      
      // We don't use await here because we want the function to run independently
      this.executeSchedule(id).catch(err => {
        this.log(`Unhandled error in executeSchedule for [${id}]:`, err);
      });
    }, delay);
    
    // Store the timer reference
    this.timers.set(id, timer);
  }
  
  // Handle server restart - restore active schedules
  restoreSchedules(): void {
    this.log('Attempting to restore schedules after restart');
    
    for (const [id, schedule] of this.schedules.entries()) {
      if (schedule.isActive) {
        this.log(`Restoring schedule [${id}]`);
        
        // Reset execution flag after restart
        schedule.isCurrentlyExecuting = false;
        
        // If next run time is in the past, run now
        const now = new Date();
        if (schedule.nextRunTime && schedule.nextRunTime < now) {
          this.log(`Missed execution for [${id}], running now`);
          this.executeSchedule(id).catch(err => {
            this.log(`Error executing missed schedule [${id}]:`, err);
          });
        } else if (schedule.nextRunTime) {
          // Schedule is in the future, just restore the timer
          this.log(`Restoring future timer for [${id}]`);
          this.scheduleNext(id);
        } else {
          // No next run time, execute immediately
          this.log(`No next run time for [${id}], executing now`);
          this.executeSchedule(id).catch(err => {
            this.log(`Error executing schedule [${id}] without next run time:`, err);
          });
        }
      }
    }
  }
  
  // Logging helper
  private log(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[SCHEDULER ${timestamp}] ${message}`);
    if (data) {
      if (data instanceof Error) {
        console.log(`[SCHEDULER ${timestamp}] Error: ${data.message}`);
        console.log(`[SCHEDULER ${timestamp}] Stack: ${data.stack}`);
      } else {
        console.log(`[SCHEDULER ${timestamp}] ${JSON.stringify(data, null, 2)}`);
      }
    }
  }
}

// Export a singleton instance
export const schedulerService = new SchedulerService();

// Call restore on startup
schedulerService.restoreSchedules();