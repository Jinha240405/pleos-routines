// Bridge double used only by automated tests. Never included in the app bundle.
export async function mockNative(page, { fail = false } = {}) {
  await page.addInitScript(({ fail }) => {
    const values = new Map(); window.calls = [];
    window.__device = { temperature: 28, battery: 72, door: false, climate: 24, fan: 0, setSample: (id, args, value) => values.set(id + ':' + JSON.stringify(args), value) };
    window.AndroidBridge = {
      loadState: () => localStorage.getItem('native-fixture-state') || '',
      saveState: text => { localStorage.setItem('native-fixture-state', text); return true; },
      request: text => {
        const request = JSON.parse(text); window.calls.push(request);
        let value = { status: 'registered' }, error;
        if (request.action === 'community.request') {
          // Community integration is tested with real HTTP in independent browser contexts.
          value = { items: [], total: 0, page: 1, pages: 0 };
        } else if (request.action === 'door') value = { open: window.__device.door, raw: window.__device.door ? 1 : 0 };
        else if (request.action === 'api.invoke') {
          const id = request.operation, key = id + ':' + JSON.stringify(request.args);
          if (fail) error = '이 차량에서 지원하지 않습니다.';
          if (values.has(key)) value = values.get(key);
          else if (id.includes('.check')) value = { values: [] };
          else if (id === 'HVAC.getHvacTemperatureCurrent') value = window.__device.temperature;
          else if (id === 'EvBattery.getEvBatteryStateOfCharge') value = window.__device.battery;
          else if (id === 'Gear.getCurrentGearSelectionState') value = 'GEAR_PARK';
          else if (id.includes('Occupancy')) value = true;
          else if (id.includes('BeltBuckled')) value = false;
          else if (id === 'HVAC.setHvacTemperature') window.__device.climate = request.args.find(v => typeof v === 'number');
          else if (id === 'HVAC.setHvacFanSpeed') window.__device.fan = request.args.find(v => typeof v === 'number');
          else value = 0;
        }
        setTimeout(() => window.PleosNative.resolve(request.id, error ? { ok: false, error } : { ok: true, value }), 5);
      },
    };
  }, { fail });
}
