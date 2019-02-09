import React, { Component } from 'react';
import lune from './lune/lune';
import { Container, Form, Button, Jumbotron, Table } from 'react-bootstrap';
import moment from 'moment';
import ical from 'ical-generator';
import FileSaver from 'file-saver';

const practiceTimes = [...Array(48).keys()].map(key => {
  const value = key / 2;
  const floored = Math.floor(value);
  const time =
    String(floored).padStart(2, '0') +
    ':' +
    String(60 * (value - floored)).padStart(2, '0');
  return time;
});

const AVOIDANCE_OPTIONS = {
  '+1': {
    label: '+',
    getEventTime: peakTime => moment(peakTime).add(1, 'days')
  },
  '-1': {
    label: '-',
    getEventTime: peakTime => moment(peakTime).subtract(1, 'days')
  },
  '': {
    label: '',
    getEventTime: peakTime => moment(peakTime)
  }
};

class App extends Component {
  constructor(props) {
    super(props);
    // handle the case where we don't detect the browser
    this.state = {
      timezone: moment.tz.guess(),
      avoidPeakTime: true,
      practiceTime: '06:00',
      upToYear: String(
        moment()
          .add(1, 'Y')
          .year()
      ),
      reminder: false,
      reminderOption: '1',
      showExactTime: true
    };
  }

  handleInputChange = event => {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.setState({ [name]: value });
  };

  getMoonPhases = phaseType => {
    const now = new Date();
    // const now = new Date('2018-01-01T00:00:00.000Z');
    const upTo = new Date(this.state.upToYear + '-12-31T23:59:59.999Z');

    const phaseList = lune.phase_range(now, upTo, phaseType);

    return phaseList;
  };

  getFullMoons = () => {
    return this.getMoonPhases(lune.PHASE_FULL).map(time => {
      return { time, phase: '🌕Full' };
    });
  };

  getNewMoons = () => {
    return this.getMoonPhases(lune.PHASE_NEW).map(time => {
      return { time, phase: '🌑New' };
    });
  };

  getMoondays = () => {
    const fullMoondays = this.getFullMoons();
    const newMoondays = this.getNewMoons();

    const moondays = [...fullMoondays, ...newMoondays].sort((a, b) => {
      if (a.time < b.time) {
        return -1;
      }
      if (a.time > b.time) {
        return 1;
      }
      return 0;
    });
    // console.log(moondays)
    return moondays;
  };

  getAvoidanceOptions = time => {
    const peakTime = moment(time);
    const practiceTime = moment(
      peakTime.year() +
        '-' +
        (Number(peakTime.month()) + 1) +
        '-' +
        peakTime.date() +
        ' ' +
        this.state.practiceTime,
      'YYYY-MM-DD HH:mm'
    );
    const previousPracticeTime = moment(practiceTime).subtract(24, 'hours');
    const nextPracticeTime = moment(practiceTime).add(24, 'hours');
    const practiceBeforePeakTime = {
      diff: Math.abs(
        moment.duration(moment(previousPracticeTime).diff(peakTime)).asHours()
      ),
      option: AVOIDANCE_OPTIONS['-1']
    };
    const practiceAtPeakTime = {
      diff: Math.abs(
        moment.duration(moment(practiceTime).diff(peakTime)).asHours()
      ),
      option: AVOIDANCE_OPTIONS['']
    };
    const practiceAfterPeakTime = {
      diff: Math.abs(
        moment.duration(moment(nextPracticeTime).diff(peakTime)).asHours()
      ),
      option: AVOIDANCE_OPTIONS['+1']
    };
    const options = [
      practiceBeforePeakTime,
      practiceAtPeakTime,
      practiceAfterPeakTime
    ];
    // console.log({ peakTime: peakTime.toString(), ...options });
    const avoidanceOption = options.reduce((carry, option) => {
      if (carry.diff > option.diff) {
        return option;
      }
      return carry;
    }, practiceAtPeakTime);
    return avoidanceOption.option;
  };

  generateEvents = () => {
    const moondays = this.getMoondays();
    const cal = ical({
      domain: 'eggli.github.io',
      name: 'Moondays',
      timezone: this.state.timezone
    });
    moondays.forEach(moonday => {
      const avoidanceOptions = this.getAvoidanceOptions(moonday.time);
      const isInPeakTime = this.state.avoidPeakTime && avoidanceOptions;

      const label = isInPeakTime ? avoidanceOptions.label : '';
      const eventTime = isInPeakTime
        ? avoidanceOptions.getEventTime(moonday.time)
        : moonday.time;

      const summary =
        moonday.phase +
        ' Moon' +
        label +
        (this.state.showExactTime
          ? '@' + moment(eventTime).format('HH:mm:ss')
          : '');

      const event = cal.createEvent({
        start: eventTime,
        allDay: true,
        summary,
        description: summary
      });

      if (this.state.reminder) {
        event.createAlarm({
          type: 'display',
          trigger: moment(eventTime).subtract(
            Number(this.state.reminderOption),
            'days'
          )
        });
      }
    });

    const calstr = cal.toString();
    const blob = new Blob([calstr], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    FileSaver.saveAs(blob, 'moondays.ics');
    URL.revokeObjectURL(url);
  };

  render() {
    const displayFormat = this.state.showExactTime
      ? 'YYYY/MM/DD HH:mm:ss'
      : 'YYYY/MM/DD';
    return (
      <Jumbotron>
        <Container>
          <h1>Ashtanga Moonday Calendar</h1>
          <p>
            Namaste Ashtangis, this is a simple tool to generate Moondays as
            events with optional reminders on your calendar.
          </p>
          <h2>Usage</h2>
          <p>
            Fill the forms below to create your own moonday calendar events,
            click the 'Download Moonday Events' button to download desired
            calendar events file, on mobile devices, it should be imported to
            your calendar under your permission, on desktop computers, open the
            downloaded file to import these events to your calendar.
          </p>
          <p>
            <strong>
              Please open this web page in Safari on iOS devices, otherwise, you
              may see a blank page after download.
            </strong>
          </p>

          <Form>
            <Form.Group controlId="upToYear">
              <Form.Label>Generate moonday events up to this year</Form.Label>
              <Form.Control
                name="upToYear"
                type="number"
                value={this.state.upToYear}
                min={moment().year()}
                max={moment().year() + 3}
                onChange={this.handleInputChange}
              />
              <Form.Text className="text-muted">
                Type&nbsp;
                {moment().year() + 1}
                &nbsp; here and you will get moondays up to last day of
                year&nbsp;
                {moment().year() + 1}.
              </Form.Text>
            </Form.Group>
            <Form.Group controlId="showExactTime">
              <Form.Label>Show exact full/new phase peak time</Form.Label>
              <Form.Check
                type="checkbox"
                name="showExactTime"
                checked={this.state.showExactTime}
                onChange={this.handleInputChange}
              />
            </Form.Group>
            <Form.Group controlId="avoidPeakTime">
              <Form.Label>Avoid full/new phase peak time</Form.Label>
              <Form.Check
                type="checkbox"
                name="avoidPeakTime"
                checked={this.state.avoidPeakTime}
                onChange={this.handleInputChange}
              />
              <Form.Text className="text-muted">
                By checking this, full/new moon phases that too close to your
                practice time will be shifted to next day. Moondays that shifted
                will be marked with a plus sign (+) or a minus sign (-).
              </Form.Text>
            </Form.Group>
            {this.state.avoidPeakTime ? (
              <Form.Group controlId="practiceTime">
                <Form.Label>What's your regular practice time?</Form.Label>
                <Form.Control
                  as="select"
                  name="practiceTime"
                  value={this.state.practiceTime}
                  onChange={this.handleInputChange}
                >
                  {practiceTimes.map(time => {
                    return <option key={time}>{time}</option>;
                  })}
                </Form.Control>
                <Form.Text className="text-muted">
                  For example, a full moon peaked at 1st of April, 19:00 and
                  your practice time is 06:00 in the morning, that moonday will
                  be shifted to 2nd of April or 31th of March due to it's too
                  close (within 12 hours) to your practice time.
                </Form.Text>
              </Form.Group>
            ) : null}
            <Form.Group controlId="reminderOptions">
              <Form.Label>Reminder Options</Form.Label>
              <Form.Check
                type="checkbox"
                name="reminder"
                checked={this.state.reminder}
                onChange={this.handleInputChange}
              />
              <Form.Text className="text-muted">
                By checking this, a reminder will be set into moonday events,
                a.k.a. Moonday Eve Party Time.
              </Form.Text>
            </Form.Group>
          </Form>
          {this.state.reminder ? (
            <Form.Group controlId="reminderOption">
              <Form.Label>
                When should you get notified before moonday?
              </Form.Label>
              <Form.Control
                as="select"
                name="reminderOption"
                value={this.state.reminderOption}
                onChange={this.handleInputChange}
              >
                <option value={'1'}>One day</option>
                <option value={'2'}>Two days</option>
              </Form.Control>
              <Form.Text className="text-muted">
                You will be notifed on desired timing, e.g. Two days before
                Moonday for night activities arrangement.
              </Form.Text>
            </Form.Group>
          ) : null}

          <Button variant="primary" onClick={this.generateEvents}>
            Download Moonday Events
          </Button>
          <p />
          <h2>Questions? Suggestions?</h2>
          <p>Contact me: aeggli@gmail.com</p>
          <h2>Moonday Events Preview</h2>
          <p>Listing up to 50 moondays.</p>
          <Table striped bordered responsive>
            <thead>
              <tr>
                <th>Moon Phase</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {this.getMoondays()
                .slice(0, 50)
                .map(moonday => {
                  const avoidanceOptions = this.getAvoidanceOptions(
                    moonday.time
                  );
                  const isInPeakTime =
                    this.state.avoidPeakTime && avoidanceOptions;

                  const eventTime = isInPeakTime
                    ? avoidanceOptions
                        .getEventTime(moonday.time)
                        .format(displayFormat)
                    : moment(moonday.time).format(displayFormat);
                  return (
                    <tr key={moonday.time}>
                      <td>
                        {moonday.phase}
                        {isInPeakTime ? avoidanceOptions.label : ''}
                      </td>
                      <td>{eventTime}</td>
                    </tr>
                  );
                })}
            </tbody>
          </Table>
        </Container>
      </Jumbotron>
    );
  }
}

export default App;
