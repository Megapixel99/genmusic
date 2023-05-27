"use strict";

const fs = require("fs");
const AudioContext = require("web-audio-engine").RenderingAudioContext;

const globalNotes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];

const hrToSec = (renderstart) => Number(`${process.hrtime(renderstart)[0]}.${process.hrtime(renderstart)[1]}`);

let randOscilator = () => {
  let a = ['sine', 'square'];
  return a[Math.floor(Math.random() * a.length)];
}

function shuffleonePoly() {
  return randompolyrhythm(getRndInteger(2, 7));
}

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function randompolyrhythm(div) {
  let re = "";
  let c = 0;
  for (var i = 0; i < div; i++) {
    c = getRndInteger(1, 15);
    switch (c) {
      case 1:
        re += "Io";
        break;
      case 2:
        re += "io";
        break;
      case 4:
        re += "ii";
        break;
      case 5:
        re += "xi";
        break;
      case 6:
        re += "ix";
        break;
      case 7:
        re += "xx";
        break;
      case 3:
        re += "xi";
        break;
      case 8:
        re += "xI";
        break;
      case 9:
        re += "Ii";
        break;
      case 10:
        if (i < div - 1) {
          re += "Iooo";
          i += 1;
        } else {
          re += "ii";
        }
        break;
      case 11:
        re += "iI";
        break;
      case 12:
        re += "xx";
        break;
      case 13:
        re+= "xx";
        break;
      case 14:
        re+= "ix";
        break;
    }
  }

  return re;
}

class PolyUnit {
  constructor(rhythm, notes, basetempo, type, context, renderstart) {
    this.rhythm = rhythm;
    this.notes = notes;
    this.basetempo = basetempo;
    this.type = type;
    this.cr = (rhythm.length / 8);
    this.commoncolors = [[1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,0,1],[0,1,1]];
    // let bgcolor = pastelColor([1, 1, 1]);
    let bgcolor = this.commoncolors[Math.floor(Math.random() * this.commoncolors.length)]
    this.colorred = bgcolor[0];
    this.colorblue = bgcolor[1];
    this.colorgreen = bgcolor[2];
    this.lastOscUsed = 0;
    this.context = context;
    this.renderstart = renderstart;
  }

  notetoFreq(note) { //[Note][Octave0-9]
    var octave;
    var noteNumber;
    if (note.length === 3) {
      octave = note.charAt(2);
    } else {
      octave = note.charAt(1);
    }
    noteNumber = globalNotes.indexOf(note.slice(0, -1));
    if (noteNumber < 3) { // If below C
      noteNumber = noteNumber + 13 + (12 * (octave - 1)) //adjusting by the octave
    } else {
      noteNumber = noteNumber + 1 + (12 * (octave - 1))
    }
    return 440 * Math.pow(2, (noteNumber - 49) / 12)
  }

  playNotes(notearray, oscillators, gains, eqs, time, eighthNoteTime, duration, accent, type) {
    gains[this.lastOscUsed] = null;
    oscillators[this.lastOscUsed] = null;
    eqs[this.lastOscUsed] = null;
    gains[this.lastOscUsed] = this.context.createGain();
    oscillators[this.lastOscUsed] = this.context.createOscillator();
    eqs[this.lastOscUsed] = this.context.createBiquadFilter();
    oscillators[this.lastOscUsed].type = type;
    oscillators[this.lastOscUsed].frequency.value = this.notetoFreq(notearray);
    oscillators[this.lastOscUsed].connect(eqs[this.lastOscUsed]);
    eqs[this.lastOscUsed].type = "highshelf";
    eqs[this.lastOscUsed].frequency.setValueAtTime(this.notetoFreq("F4"), hrToSec(this.renderstart));
    eqs[this.lastOscUsed].gain.setValueAtTime(-20, hrToSec(this.renderstart));
    eqs[this.lastOscUsed].q = 1.4;
    eqs[this.lastOscUsed].connect(gains[this.lastOscUsed]);
    gains[this.lastOscUsed].connect(this.context.destination);

    this.gainMultiplier = 1/10;
    if (accent) {
      gains[this.lastOscUsed].gain.setValueAtTime(0.5 * this.gainMultiplier, time);
    } else {
      gains[this.lastOscUsed].gain.setValueAtTime(0.13 * this.gainMultiplier, time);
    }

    gains[this.lastOscUsed].gain.exponentialRampToValueAtTime(0.0001, (time + eighthNoteTime * (duration + 1)) + (eighthNoteTime * (duration + 4)));
    oscillators[this.lastOscUsed].start(time);
    oscillators[this.lastOscUsed].stop(time + eighthNoteTime * (duration + 1));
    this.lastOscUsed += 1;
    this.lastOscUsed = this.lastOscUsed % 20;
  }

  ostinato(rhythm, notearray, tempo, startTime, type, ostOsc, gains, eQArray) {
    var time = startTime;
    let state = "";

    let eighthNoteTime = (60 / tempo) / 2;
    for (let i = 0; i < rhythm.length; i++) {
      let lookahead = 1;
      let durationadded = 0;

      if ((rhythm[i] == "i" || rhythm[i] == "I") && rhythm[i + 1] == "o") {
        durationadded += 1;
        lookahead += 1;

        while (rhythm[i + lookahead] == "o") {
          lookahead += 1;
          durationadded += 1;
        }
      }

      state = rhythm[i];

      switch (state) {
        case "I":
          //play

          this.playNotes(notearray, ostOsc, gains, eQArray, time + i * eighthNoteTime, eighthNoteTime, durationadded, 1, type);

          break;
        case "i":
          this.playNotes(notearray, ostOsc, gains, eQArray, time + i * eighthNoteTime, eighthNoteTime, durationadded, 0, type);
          break;

        case "x":
          break;

        case "o":
          break;
      }
    }
  }

  play(startTime, ostOsc, gains, eQArray) {
    this.ostinato(this.rhythm, this.notes[0], this.basetempo * this.cr, startTime, this.type, ostOsc, gains, eQArray);
  }
}

class MusicEngine {
  constructor() {
    this.lastnotedegree = 1;
    this.notesbuffer = [];
    this.barcount = 0;
    this.chordcache = [];
    this.global_previous_chords = [];
    this.expectedtime = 0.0;
    this.mutateNumber = 3;
    this.timediff = 0.0;
    this.intervalstack = 3;
    this.firstbar = 1;
    this.globalscale = 'TSTTSTS';
    this.e_l_notedegree;
    this.e_l_basetempo;
    this.e_l_oldchords;
    this.set_timeout;
    this.gainMultiplier = 1.0;
    this.MajorScale = 'TTSTTTS';
    this.MinorScale = 'TSTTSTS';
    this.WholeTone = 'TTTTTTT';
    this.Octatonic1 = 'TSTSTSTS';
    this.Octatonic2 = 'STSTSTST';
    this.MajorFlat6 = 'TTSTSSTS';
    this.basetempo = 66;
    this.key = 'C';
    this.circleofFifths = ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"];
    this.isPlaying = 0;
    this.context = new AudioContext;
    this.PolyUnits = []
    this.renderstart = process.hrtime();
    this.OstOsc = Array.apply(null, Array(20)).map(() => {
      let o = this.context.createOscillator();
      o.type = 'sine';
      return o;
    });
    this.Gains = Array.apply(null, Array(20)).map(() => this.context.createGain());
    this.EQArray = Array.apply(null, Array(20)).map(() => this.context.createBiquadFilter());

    this.PolyUnits.push(new PolyUnit(shuffleonePoly(), [ "G#3" ], this.basetempo, randOscilator(), this.context, this.renderstart));
    this.PolyUnits.push(new PolyUnit(shuffleonePoly(), [ "G5" ], this.basetempo, randOscilator(), this.context, this.renderstart));
    this.PolyUnits.push(new PolyUnit(shuffleonePoly(), [ "C4" ], this.basetempo, randOscilator(), this.context, this.renderstart));
    this.PolyUnits.push(new PolyUnit(shuffleonePoly(), [ "A#4" ], this.basetempo, randOscilator(), this.context, this.renderstart));
  }

  randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  getContext() {
    return this.context;
  }

  startPlaying() {
    this.isPlaying = 1;
  }

  stopPlaying() {
    this.isPlaying = 0;
  }

  pastelColor(colormix) {
    let red = Math.random() * 0.8;
    let blue = Math.random()* 0.8;
    let green = Math.random()* 0.8;
    if (colormix != null) {
      red = (red + colormix[0]) / 2;
      green = (green + colormix[1]) / 2;
      blue = (blue + colormix[2]) / 2;
    }
    return ([red, green, blue]);

  }

  changeTempo(targetTempo, Cells) {
    for (var i = Cells.length - 1; i >= 0; i--) {
      Cells[i].basetempo = parseFloat(targetTempo);
    }
  }

  isEqual(arr1, arr2) {
    if (arr1.length == arr2.length) {
      for (var i = 0; i < arr1.length; i++) {
        if (arr1[i] != arr2[i]) {
          return 0;
        }

      }
      return 1;
    } else {
      return 0;
    }
  }

  findDistance(note1, note2) {
    let octave2 = "";
    let note1Number = "";
    let note2Number = "";
    let octave1 = "";

    if (note1.length === 3) {
      octave1 = note1.charAt(2);
    } else {
      octave1 = note1.charAt(1);
    }
    note1Number = globalNotes.indexOf(note1.slice(0, -1));

    if (note2.length === 3) {
      octave2 = note2.charAt(2);
    } else {
      octave2 = note2.charAt(1);
    }
    note2Number = globalNotes.indexOf(note2.slice(0, -1));

    note1Number += 12 * parseInt(octave1);
    note2Number += 12 * parseInt(octave2);

    return Math.abs(note2Number - note1Number);

  }

  key_transpose(note, setting) {
    let originalnum = 0;
    let transposednum = 0;

    originalnum = globalNotes.indexOf(note)

    transposednum = (originalnum + setting)
    if (transposednum >= 12) {
      return (globalNotes[(transposednum - 12)])
    } else if (transposednum < 0) {
      return (globalNotes[(transposednum + 12)])
    } else {
      return (globalNotes[transposednum])
    }

  }

  getScale(key, scale) //returns set of notes
  {
    let scaleset = [];
    let totalmovements = 0;
    let distanceLetter = 0;
    scaleset.push(key);
    for (var i = 0; i < scale.length; i++) {
      distanceLetter = scale.charAt(i);
      if (distanceLetter == "T") {
        totalmovements += 2
        scaleset.push(this.key_transpose(key, totalmovements));
      } else if (distanceLetter == "S") {
        totalmovements += 1
        scaleset.push(this.key_transpose(key, totalmovements));
      }
    }
    scaleset.pop();
    return scaleset;
  }

  dia_chordConstructor(key, currentdegree, interval, number, scale) {
    let chordtones = [];
    let notes = this.getScale(key, scale);
    let currdegree = currentdegree;

    for (var i = 0; i < number; i++) {
      if (currdegree == 0) {
        currdegree += 7;
      }
      chordtones.push(notes[currdegree - 1]);
      currdegree = (currdegree + (interval - 1)) % notes.length
    }
    return chordtones;

  }

  scatter(inputnotes, scat) {

    let outputnotes = [];
    let numofnotes = 0;

    if (scat) {
      numofnotes = inputnotes.length;
      if (numofnotes == 1) {
        return [inputnotes[0] + (getRndInteger(3, 4).toString())]
      } else if (numofnotes == 2) {
        outputnotes.push(inputnotes[0] + (getRndInteger(3, 4).toString()));
        for (var i = 1; i < inputnotes.length; i++) {
          outputnotes.push(inputnotes[i] + (getRndInteger(4, 6).toString()));
        }
      } else {
        outputnotes.push(inputnotes[0] + (getRndInteger(3, 4).toString()));
        for (var i = 1; i < inputnotes.length - 1; i++) {
          outputnotes.push(inputnotes[i] + (getRndInteger(4, 6).toString()));
        }
        outputnotes.push(inputnotes[numofnotes - 1] + (getRndInteger(5, 7).toString()))
      }
    } else {
      for (var i = 0; i < inputnotes.length; i++) {
        outputnotes.push(inputnotes[i] + "4");
      }
    }
    return outputnotes;
  }

  chordchanger(currentchord) {
    let selectedchord = 0;
    switch (currentchord) {
      case 1:
        {
          selectedchord = this.randomElement([1, 1, 4, 5, 6, 3]);
          break;
        }

      case 2:
        {
          selectedchord = this.randomElement([5, 3, 5, 4, 6]);
          break;
        }

      case 3:
        {
          selectedchord = this.randomElement([3, 1, 6, 6, 4, 4]);
          break;
        }

      case 4:
        {
          selectedchord = this.randomElement([1, 1, 4, 5, 2]);
          break;
        }

      case 5:
        {
          selectedchord = this.randomElement([1, 1, 4, 6]);
          break;
        }

      case 6:
        {
          selectedchord = this.randomElement([1, 1, 4, 2, 2]);
          break;
        }

      case 7:
        {
          selectedchord = this.randomElement([3, 5, 3, 1, 1]);
          break;
        }
    }

    return selectedchord;
  }

  //Input: Previous Notes, Target Chord | Output: Next notes
  voice_seperation(key, currentdegree, interval, number, scale) {
    let upperb = 7;
    let lowerb = 2;
    let notes = this.getScale(key, scale);
    let chordtones = null;
    this.chordcache = null;
    let octave = 0;
    let leftdist = 0;
    let rightdist = 0;
    let samedist = 0;
    chordtones = [];
    this.chordcache = [];
    for (var i = 0; i < number; i++) {
      if (currentdegree == 0) {
        currentdegree += 7;
      }
      chordtones.push(notes[currentdegree - 1]);
      this.chordcache.push(notes[currentdegree - 1]);
      currentdegree = (currentdegree + (interval - 1)) % notes.length
    }

    if (this.global_previous_chords.length == chordtones.length) {
      for (var i = 0; i < number; i++) {
        if (this.global_previous_chords[i].length === 3) {
          octave = parseInt(this.global_previous_chords[i].charAt(2));
        } else {
          octave = parseInt(this.global_previous_chords[i].charAt(1));
        }
        leftdist = this.findDistance((chordtones[i] + ((octave) - 1)), this.global_previous_chords[i]);
        rightdist = this.findDistance((chordtones[i] + ((octave) + 1)), this.global_previous_chords[i]);
        samedist = this.findDistance((chordtones[i] + (octave)), this.global_previous_chords[i]);

        if ((leftdist <= rightdist) && (leftdist <= samedist)) {
          if (octave > lowerb) {
            chordtones[i] = chordtones[i] + (octave - 1);
          } else {
            chordtones[i] = chordtones[i] + (octave);
          }
        } else if ((rightdist <= leftdist) && (rightdist <= samedist)) {
          if (octave < upperb) {
            chordtones[i] = chordtones[i] + (octave + 1);
          } else {
            chordtones[i] = chordtones[i] + (octave);
          }
        } else if ((samedist <= leftdist) && (samedist <= rightdist)) {
          chordtones[i] = chordtones[i] + (octave);
        } else {
          chordtones[i] = chordtones[i] + (octave);
          console.error("unexpected:" + leftdist + " " + rightdist + " " + samedist + " ");
        }
      }
    } else if (this.global_previous_chords.length > chordtones.length) { //polys removed
      for (var i = 0; i < chordtones.length; i++) {
        if (this.global_previous_chords[i].length === 3) {
          octave = parseInt(this.global_previous_chords[i].charAt(2));

        } else {
          octave = parseInt(this.global_previous_chords[i].charAt(1));
        }

        leftdist = this.findDistance((chordtones[i] + ((octave) - 1)), this.global_previous_chords[i]);
        rightdist = this.findDistance((chordtones[i] + ((octave) + 1)), this.global_previous_chords[i]);
        samedist = this.findDistance((chordtones[i] + (octave)), this.global_previous_chords[i]);
        if ((leftdist <= rightdist) && (leftdist <= samedist)) {
          if (octave > lowerb) {
            chordtones[i] = chordtones[i] + (octave - 1);
          } else {
            chordtones[i] = chordtones[i] + (octave);
          }
        } else if ((rightdist <= leftdist) && (rightdist <= samedist)) {
          if (octave < upperb) {
            chordtones[i] = chordtones[i] + (octave + 1);
          } else {
            chordtones[i] = chordtones[i] + (octave);
          }

        } else if ((samedist <= leftdist) && (samedist <= rightdist)) {
          chordtones[i] = chordtones[i] + (octave);

        } else {
          chordtones[i] = chordtones[i] + (octave);
          console.error("unexpected:" + leftdist + " " + rightdist + " " + samedist + " ");
        }
      }
    } else if (this.global_previous_chords.length < chordtones.length) { //polys added
      for (var i = 0; i < this.global_previous_chords.length; i++) {
        if (this.global_previous_chords[i].length === 3) {
          octave = parseInt(this.global_previous_chords[i].charAt(2));

        } else {
          octave = parseInt(this.global_previous_chords[i].charAt(1));
        }

        leftdist = this.findDistance((chordtones[i] + ((octave) - 1)), this.global_previous_chords[i]);
        rightdist = this.findDistance((chordtones[i] + ((octave) + 1)), this.global_previous_chords[i]);
        samedist = this.findDistance((chordtones[i] + (octave)), this.global_previous_chords[i]);

        if ((leftdist <= rightdist) && (leftdist <= samedist)) {
          if (octave > lowerb) {
            chordtones[i] = chordtones[i] + (octave - 1);
          } else {
            chordtones[i] = chordtones[i] + (octave);
          }
        } else if ((rightdist <= leftdist) && (rightdist <= samedist)) {
          if (octave < upperb) {
            chordtones[i] = chordtones[i] + (octave + 1);
          } else {
            chordtones[i] = chordtones[i] + (octave);
          }

        } else if ((samedist <= leftdist) && (samedist <= rightdist)) {
          chordtones[i] = chordtones[i] + (octave);

        } else {
          chordtones[i] = chordtones[i] + (octave);
          console.error("unexpected:" + leftdist + " " + rightdist + " " + samedist + " ");
        }
      }
      for (var i = this.global_previous_chords.length; i < chordtones.length; i++) {
        chordtones[i] = chordtones[i] + getRndInteger(4, 6);
      }
    }

    if (this.isEqual(this.global_previous_chords, chordtones)) {
      chordtones = this.scatter(this.chordcache, 1);
    }
    return chordtones;
  }
  //----Melody Harmony BOILERPLATE CODE____-----____---____--___-_____---
  //eachvoice should have their own oscillator array.

  //----POLYUNIT BOILERPLATE CODE____-----____---____--___-_____----
  shufflePoly(start, end) {
    var chosencolor;
    let cr = this.PolyUnits[0].rhythm.length / 8;
    for (var i = start; i < end; i++) {
      chosencolor = this.pastelColor([1, 1, 1]);
      this.PolyUnits[i].rhythm = null
      this.PolyUnits[i].rhythm = randompolyrhythm(getRndInteger(2, 7));
      this.PolyUnits[i].colorred = chosencolor[0];
      this.PolyUnits[i].colorgreen = chosencolor[1];
      this.PolyUnits[i].colorblue = chosencolor[2];
      this.PolyUnits[i].cr = cr;
    }
  }

  PolyTrigger(PolyArray, time) {
    // document.getElementById('polydisplay').value = ""
    for (var i = 0; i < PolyArray.length; i++) {
      // document.getElementById('polydisplay').value += PolyArray[i].rhythm + "--";
      // document.getElementById('polydisplay').value += PolyArray[i].notes + "\n";
      PolyArray[i].play(time, this.OstOsc, this.Gains, this.EQArray, this.context);
    }
  }

  e_l_updateChords() {
    this.e_l_notedegree = this.lastnotedegree;
    this.e_l_basetempo = this.PolyUnits[0].basetempo;
    if ((this.lastnotedegree == 5 || this.lastnotedegree == 4)) {
      if (Math.random() < 0.35) {//percent chance of keychange on 4 or 5
        this.key = this.key_transpose(this.key, (Math.random() < 0.5 ? 1 : -1) * 7);
        this.e_l_notedegree = this.randomElement([1, 1, 6, 6, 4]);
      } else {
        this.e_l_notedegree = this.chordchanger(this.lastnotedegree);
      }
    } else {
      this.e_l_notedegree = this.chordchanger(this.lastnotedegree);
    }
  }

  autoMutate(times) {
    let pol1 = Math.random() < 0.5 ? -1 : 1;
    let pol2 = Math.random() < 0.5 ? -1 : 1;
    let pol3 = Math.random() < 0.15 ? 1 : 0;
    let pol4 = Math.random() < 0.5 ? 1 : 0;
    let pol5 = Math.random() < 0.35 ? 1 : 0;
    let currtempo;
    let newtempo;

    let mutseed = getRndInteger(1,times*4);
    if (mutseed>times*1.8) {
      if (pol5) {
        currtempo = this.basetempo;
        let tempodiff = getRndInteger(5,15);
        pol1 = currtempo < 70 ? 1 : pol1;
        newtempo = currtempo + (pol1 * tempodiff);
        this.changeTempo(newtempo, this.PolyUnits);
      }
      if (pol3) {
        this.key = this.key_transpose(this.key,pol2*7);
      }
      if (pol5) {
        let shufflenum = getRndInteger(1,this.PolyUnits.length);
        let targets = []
        for (var i = 0; i < shufflenum; i++){
          let target = getRndInteger(0,this.PolyUnits.length);
          this.shufflePoly(target,target+1);
          targets.push(target);
        }
      }
      if (pol4) {
        if (pol3) {
          if (this.PolyUnits.length>3) {
            this.PolyUnits.pop();
          };
        }
        else if (this.PolyUnits.length <= 5) {
         this.PolyUnits.push(new PolyUnit(shuffleonePoly(), [], currtempo, randOscilator(), this.context, this.renderstart));
        }
      }
      return 3;
    }
    else {
      return times+1;
    }
  }

  EventLoop(key, startTime) {
    if (this.isPlaying == 1) {
      clearTimeout(this.set_timeout);
      this.set_timeout = setTimeout(() => {
        // if (this.barcount !== 1) {
          this.e_l_updateChords();
          if (this.firstbar) {
            this.global_previous_chords = this.dia_chordConstructor(key, this.e_l_notedegree, this.intervalstack, this.PolyUnits.length, this.globalscale);
            this.global_previous_chords = this.scatter(this.global_previous_chords, 1);
            this.firstbar = 0;
          } else {
            this.e_l_oldchords = this.global_previous_chords;
            this.global_previous_chords = this.voice_seperation(key, this.e_l_notedegree, this.intervalstack, this.PolyUnits.length, this.globalscale);
            if (this.e_l_oldchords == this.global_previous_chords) {
              this.global_previous_chords = this.scatter(this.notesbuffer, 1);
            }
          }
        //-------------------------------------
          for (var i = 0; i < this.PolyUnits.length; i++) {
            this.PolyUnits[i].notes = null;
            this.PolyUnits[i].notes = [this.global_previous_chords[i]];
          }
          this.lastnotedegree = this.e_l_notedegree;
          this.PolyTrigger(this.PolyUnits, hrToSec(this.renderstart))
        // }
      }, startTime - hrToSec(this.renderstart));

      if ((this.barcount % 2 == 0)) {
        this.mutateNumber = this.autoMutate(this.mutateNumber);
      }

      this.barcount += 1;
      if (this.barcount < -1) {
        this.isPlaying = 0;
        setTimeout(() => {
          this.isPlaying = 1;
          this.barcount = 0;
          this.EventLoop(key, (startTime + (240 / this.e_l_basetempo)), this.globalscale)

        }, (240000 / this.e_l_basetempo));

      } else {
        setTimeout(() => {
          this.EventLoop(key, (startTime + (240 / this.e_l_basetempo)), this.globalscale)
        }, (240000 / this.e_l_basetempo));
      }
    } else {
      this.barcount = 0;
    }
  }
}

module.exports = (outputFile, length) => {
  return new Promise((resolve, reject) => {
    let engine = new MusicEngine();
    engine.startPlaying();
    engine.EventLoop('C');

    setTimeout(() => {
      engine.getContext().processTo(new Date(length * 60 * 1000).toISOString().substr(11, 8));
      const audioData = engine.getContext().exportAsAudioData();

      engine.getContext().encodeAudioData(audioData).then((arrayBuffer) => {
        engine.stopPlaying();
        fs.writeFile(outputFile, Buffer.from(arrayBuffer), (err) => {
          if (err) {
            console.error(err);
          }
          resolve();
        });
      });
    }, 1000 * 60 * length);
  });
};
