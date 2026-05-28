import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { DynamicPricingService } from "./dynamic-pricing.service";

@Injectable()
export class PricingTickCron implements OnModuleInit {
  private readonly logger = new Logger(PricingTickCron.name);

  constructor(
    private readonly dynamicPricingService: DynamicPricingService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const schedule = this.configService.get<string>("PRICING_CRON_SCHEDULE", "0 * * * *");
    const job = new CronJob(schedule, () => {
      void this.runTick();
    });
    this.schedulerRegistry.addCronJob("pricing-tick", job);
    job.start();
    this.logger.log("Pricing tick cron started with schedule: " + schedule);
  }

  async runTick(): Promise<void> {
    try {
      this.logger.log("Running pricing tick...");
      await this.dynamicPricingService.runPricingTick();
      this.logger.log("Pricing tick finished successfully.");
    } catch (err) {
      this.logger.error("Error in pricing tick: " + (err instanceof Error ? err.message : String(err)));
    }
  }
}
