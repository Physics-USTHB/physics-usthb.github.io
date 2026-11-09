import test from "node:test";
import assert from "node:assert/strict";
import {speakNumber,speakUnit,scienceToSpeech,prepareCourseSpeech} from "../science-speech.mjs";

test("scientific decimal precision is spoken digit by digit, without rounding",()=>{
 assert.equal(speakNumber("0.05"),"zero point zero five");
 assert.equal(speakNumber("0.80"),"zero point eight zero");
 assert.equal(speakNumber("15.0"),"fifteen point zero");
 assert.equal(speakNumber("-2"),"minus two");
 assert.equal(speakNumber("1000"),"one thousand");
 assert.equal(speakNumber("A2.01"),"A2.01");
});

test("SI quantity symbols are pronounced as complete words",()=>{
 const input="At 2 s, position is 3.0 m and speed is 1.5 m/s.";
 const spoken=scienceToSpeech(input);
 assert.equal(spoken,"At two seconds, position is three point zero meters and speed is one point five meters per second.");
});

test("Celsius, resistance and electrical units have appropriate names",()=>{
 const spoken=scienceToSpeech("At -2 °C, an ideal 20 Ω resistor gives 0.10 A at 2 V.");
 assert.equal(spoken,"At minus two degrees Celsius, an ideal twenty ohms resistor gives zero point one zero amperes at two volts.");
 assert.equal(speakUnit("K","1"),"kelvin");
 assert.equal(speakUnit("K","2"),"kelvins");
 assert.equal(speakUnit("m","1"),"meter");
 assert.equal(speakUnit("m","1.0"),"meters");
});

test("graph axis units and physics symbols are clear in speech",()=>{
 const text="The axes are Time (s), Position (m), Voltage (V) and Temperature (°C).";
 assert.equal(scienceToSpeech(text),"The axes are Time, in seconds, Position, in meters, Voltage, in volts and Temperature, in degrees Celsius.");
});

test("standalone decimals are spoken while lesson IDs and timestamps remain untouched",()=>{
 const input="Read 0.05 and 2.50 aloud. A2.01 is a lesson; 14:10 is a clock time.";
 const spoken=scienceToSpeech(input);
 assert.equal(spoken,"Read zero point zero five and two point five zero aloud. A2.01 is a lesson; 14:10 is a clock time.");
});

test("speed, acceleration, length, frequency, and unit singulars are covered",()=>{
 const input="1 m/s, 2 m/s², 3 cm, 1 Hz, 5 kg, 20 K, and 3 min.";
 assert.equal(scienceToSpeech(input),
 "one meter per second, two meters per second squared, three centimeters, one hertz, five kilograms, twenty kelvins, and three minutes.");
});

test("numbers before fully written physics units are pronounced naturally",()=>{
 assert.equal(scienceToSpeech("Resistance stays at 5 ohms for 2 seconds."),
  "Resistance stays at five ohms for two seconds.");
 assert.equal(scienceToSpeech("The temperature changed by 4 degrees Celsius in 3 minutes."),
  "The temperature changed by four degrees Celsius in three minutes.");
});

test("screen text remains unchanged: only separate speech strings are transformed",()=>{
 const displayed="The simulation shows 0.35 m at 1.5 s.";
 const spoken=prepareCourseSpeech(displayed);
 assert.equal(displayed,"The simulation shows 0.35 m at 1.5 s.");
 assert.equal(spoken,"The simulation shows zero point three five meters at one point five seconds.");
});

test("read Markdown numerical tables with axis names, units and each row",()=>{
 const source="| Time (s) | Position (m) |\n|---|---|\n| 0 | 0.0 |\n| 1 | 1.5 |\n| 2 | 3.0 |";
 const spoken=prepareCourseSpeech(source);
 assert.match(spoken,/Table\. Columns: Time, in seconds; Position, in meters\./);
 assert.match(spoken,/Row one\. Time: zero seconds\. Position: zero point zero meters\./);
 assert.match(spoken,/Row three\. Time: two seconds\. Position: three point zero meters\./);
 assert.doesNotMatch(spoken,/\|---|\*/);
});

test("equipment tables retain every row and all textual labels",()=>{
 const source="| Label | Item | Number | Location |\n|---|---|---:|---|\n| A | ruler | 1 | on the shelf |\n| B | timer | 2 | under the shelf |";
 const spoken=prepareCourseSpeech(source);
 assert.match(spoken,/Row one\. Label: A\. Item: ruler\. Number: one\. Location: on the shelf\./);
 assert.match(spoken,/Row two\. Label: B\. Item: timer\. Number: two\. Location: under the shelf\./);
});

test("invalid input cannot silently produce fabricated science narration",()=>{
 assert.throws(()=>scienceToSpeech(null),/must be a string/);
 assert.throws(()=>prepareCourseSpeech({}),/must be a string/);
 assert.equal(prepareCourseSpeech(""),"");
});
