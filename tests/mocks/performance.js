const performance = {
  now: () => Date.now(),
  getEntriesByType: (type) => [],
  getEntriesByName: (name) => [],
  mark: () => {},
  measure: () => {},
  clearMarks: () => {},
  clearMeasures: () => {},
  navigation: {
    navigationStart: Date.now() - 1000,
    responseStart: Date.now() - 800,
    domContentLoadedEventEnd: Date.now() - 400,
    loadEventEnd: Date.now() - 200
  }
};

module.exports = { performance };