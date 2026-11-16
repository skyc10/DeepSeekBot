import { describe, expect, it } from 'vitest';

import { currentModel, loadGlobalModel, type BotModel } from '../src/host/bot-settings';
import { createHostClient } from '../src/host/client';
import { searchModels } from '../src/host/model-settings';
import { FakeHost } from './fake-host';

const models = [
  { provider: 'deepseek', providerName: 'DeepSeek', model: 'flash', modelName: 'Flash', efforts: [] },
  { provider: 'deepseek', providerName: 'DeepSeek', model: 'pro', modelName: 'Pro', efforts: [] },
  { provider: 'openai', providerName: 'OpenAI', model: 'gpt-4o', modelName: 'GPT-4o', efforts: [] },
];
const flash = { provider: 'deepseek', model: 'flash' };
const pro = { provider: 'deepseek', model: 'pro' };

function globalClient() {
  const fake = new FakeHost();
  fake.methods.set('modelCatalog', () => ({ models, default: flash, defaultRevision: 1 }));
  fake.methods.set('modelPresets', () => ({ presets: [] }));
  const client = createHostClient({
    routes: ['https://studio.ts.net'],
    credential: fake.credential,
    carrier: fake.carrier,
  });
  return { fake, client };
}

describe('model switch list', () => {
  it('lists every catalog model, not just the global default', async () => {
    const { client } = globalClient();
    const state = await loadGlobalModel(client);
    expect(state.models).toHaveLength(models.length);
    expect(searchModels(state.models, '')).toHaveLength(models.length);
    expect(searchModels(state.models, 'pro').map((entry) => entry.model)).toEqual(['pro']);
  });
});

describe('model switch selection', () => {
  it('reports the switched route as the current selection', () => {
    const switched: BotModel = {
      revision: 2,
      models,
      presets: [],
      fallback: flash,
      plan: {
        revision: 2,
        sourcePresetId: '',
        sourcePresetName: '',
        orchestrator: pro,
      },
    };
    expect(currentModel(switched).route).toEqual(pro);

    const inherited: BotModel = { revision: 0, models, presets: [], fallback: flash };
    expect(currentModel(inherited).route).toEqual(flash);
  });
});
