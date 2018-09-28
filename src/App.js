import React, { Component } from 'react';
import lune from 'lune';

const CalendarTypes = {
  NASA: 'nasa'
};

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      timezone: new Date().getTimezoneOffset(),
      avoidPeakTime: true,
      upToYear: 2200,
      calendarType: CalendarTypes.NASA,
      reminderOptions: {
        dateOffset: -1,
        timeToReminder: '18:00'
      }
    };
  }

  getMoonPhases = phaseType => {
    const now = new Date();
    const upTo = new Date(this.state.upToYear + '-12-31T23:59:59.999Z');

    const phaseList = lune.phase_range(now, upTo, phaseType);
    return phaseList;
  };

  getFullMoons = () => {
    return this.getMoonPhases(lune.PHASE_FULL);
  };

  getNewMoons = () => {
    return this.getMoonPhases(lune.PHASE_NEW);
  };

  render() {
    return <div />;
  }
}

export default App;
