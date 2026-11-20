import { Module } from '@nestjs/common';
import { AccountingIntelligencePipeline } from './pipeline';
import { MockAiProvider } from './mock-ai.provider';

@Module({
  providers: [
    MockAiProvider,
    {
      provide: 'AiProvider',
      useClass: MockAiProvider,
    },
    AccountingIntelligencePipeline,
  ],
  exports: [AccountingIntelligencePipeline, 'AiProvider'],
})
export class IntelligenceModule {}

