let pedometer = null;
let stepCount = 0;
let running = false;
let baseline = 0;

function extractNativeStepCount(sensor) {
  if (!sensor) {
    return null;
  }
  if (typeof sensor.cumulativeStepCount === 'number') {
    return sensor.cumulativeStepCount;
  }
  if (typeof sensor.currentStepCount === 'number') {
    return sensor.currentStepCount;
  }
  if (typeof sensor.stepCount === 'number') {
    return sensor.stepCount;
  }
  return null;
}

function post(type, data = {}) {
  self.postMessage({ type, data });
}

function stopSensor() {
  if (pedometer) {
    try {
      pedometer.removeEventListener('reading', handleReading);
      pedometer.removeEventListener('error', handleError);
      pedometer.stop();
    } catch (error) {
      console.warn('Failed to stop pedometer', error);
    }
    pedometer = null;
  }
  running = false;
}

function handleReading() {
  const extracted = extractNativeStepCount(pedometer);
  if (typeof extracted === 'number' && Number.isFinite(extracted)) {
    // Keep cumulative progress even if worker is restarted
    stepCount = Math.max(stepCount, extracted, baseline);
    post('stepUpdate', { steps: stepCount });
  }
}

function handleError(event) {
  console.warn('Pedometer error in worker', event?.error || event);
  post('trackingError');
  stopSensor();
}

function startSensor() {
  if (running || !('Pedometer' in self)) {
    if (!('Pedometer' in self)) {
      post('trackingError');
    }
    return;
  }

  try {
    pedometer = new Pedometer({ referenceFrame: 'device' });
    pedometer.addEventListener('reading', handleReading);
    pedometer.addEventListener('error', handleError);
    pedometer.start();
    running = true;
    post('trackingStarted');
  } catch (error) {
    console.warn('Failed to start pedometer in worker', error);
    post('trackingError');
  }
}

self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};

  switch (type) {
    case 'startTracking':
      baseline = typeof data?.baseline === 'number' ? data.baseline : 0;
      startSensor();
      break;

    case 'stopTracking':
      stopSensor();
      break;

    case 'syncSteps':
      post('stepsSynced', { steps: stepCount });
      break;

    default:
      break;
  }
});
