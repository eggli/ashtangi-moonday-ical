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

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      timezone: new Date().getTimezoneOffset(),
      avoidPeakTime: true,
      practiceTime: '06:00',
      upToYear: moment()
        .add(1, 'Y')
        .year(),
      reminder: false,
      reminderOption: '1'
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
    const upTo = new Date(this.state.upToYear + '-12-31T23:59:59.999Z');

    const phaseList = lune.phase_range(now, upTo, phaseType);

    return phaseList;
  };

  getFullMoons = () => {
    return this.getMoonPhases(lune.PHASE_FULL).map(time => {
      return { time, phase: 'Full' };
    });
  };

  getNewMoons = () => {
    return this.getMoonPhases(lune.PHASE_NEW).map(time => {
      return { time, phase: 'New' };
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
    return moondays;
  };

  checkPeakTime = time => {
    const peakTime = moment(time);
    const plus12 = moment(peakTime).add(12, 'h');

    const practiceTime = moment(
      peakTime.year() +
        '-' +
        (Number(peakTime.month()) + 1) +
        '-' +
        peakTime.date() +
        ' ' +
        this.state.practiceTime,
      'YYYY-MM-DD hh:mm'
    );
    const nextPracticeTime = moment(practiceTime).add(24, 'h');

    const isPracticeBetweenPeakTime = nextPracticeTime.isBetween(
      peakTime,
      plus12
    );
    return isPracticeBetweenPeakTime;
  };

  generateEvents = () => {
    const moondays = this.getMoondays();
    const cal = ical({ domain: 'eggli.github.io', name: 'Moondays' });
    moondays.forEach(moonday => {
      const isInPeakTime =
        this.state.avoidPeakTime && this.checkPeakTime(moonday.time);

      const plusOne = isInPeakTime ? '+1' : '';

      const eventTime = isInPeakTime
        ? moment(moonday.time).add(1, 'days')
        : moonday.time;

      const event = cal.createEvent({
        start: eventTime,
        allDay: true,
        summary: moonday.phase + ' Moon' + plusOne,
        description: moonday.phase + ' Moon' + plusOne
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
    return (
      <Jumbotron>
        <Container>
          <h1>Ashtanga Moonday Calendar</h1>
          <p>
            Namaste Ashtangis, this is a simple tool to generate Moondays as
            events with optional reminders on your calendar.
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
                Type 2200 here and you will get moondays up to last day of year
                2200.
              </Form.Text>
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
                practice time will be shifted to next day.
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
                  be shifted to 2nd of April due to it's too close (within 12
                  hours) to your practice time.
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
            Generate Calendar Events
          </Button>
          <h2>Moonday Events Preview</h2>
          <Table striped bordered responsive>
            <thead>
              <tr>
                <th>Moon Phase</th>
                <th>Peak Time</th>
                {this.state.avoidPeakTime ? <th>+1</th> : null}
              </tr>
            </thead>
            <tbody>
              {this.getMoondays()
                .slice(0, 50)
                .map(moonday => {
                  const isInPeakTime =
                    this.state.avoidPeakTime &&
                    this.checkPeakTime(moonday.time);

                  const eventTime = isInPeakTime
                    ? moment(moonday.time)
                        .add(1, 'days')
                        .format('YYYY/MM/DD hh:mm')
                    : moment(moonday.time).format('YYYY/MM/DD hh:mm');

                  return (
                    <tr key={moonday.time}>
                      <td>{moonday.phase}</td>
                      <td>{eventTime}</td>
                      {this.state.avoidPeakTime ? (
                        <td>{isInPeakTime ? '+1' : ''}</td>
                      ) : null}
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
