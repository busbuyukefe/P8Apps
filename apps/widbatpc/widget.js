//bug: percentage unstable when charging.
(function(){
  const COLORS = {
    'white': -1,
    'charging': 0x07E0, // "Green"
    'high':  0x05E0, // slightly darker green
    'ok': 0xFD20, // "Orange"
    'low':0xF800, // "Red"
  }
  const SETTINGS_FILE = 'widbatpc.json'
  E.getBattery = function (){
    var v = P8.batV();
    v = v<3.7?3.7:v;
    return Math.floor((v-3.7)*200);
  }

  let settings
  function loadSettings() {
    settings = require('Storage').readJSON(SETTINGS_FILE, 1) || {}
    const DEFAULTS = {
      'color': 'By Level',
      'percentage': true,
      'charger': true,
      'hideifmorethan': 100,
    };
    Object.keys(DEFAULTS).forEach(k=>{
      if (settings[k]===undefined) settings[k]=DEFAULTS[k]
    });
  }
  function setting(key) {
    if (!settings) { loadSettings() }
    return settings[key];
  }

  const levelColor = (l) => {
  // "charging" is very bright -> percentage is hard to read, "high" is ok(ish)
    const green = setting('percentage') ? COLORS.high : COLORS.charging
    switch (setting('color')) {
      case 'Monochrome': return COLORS.white; // no chance of reading the percentage here :-(
      case 'Green': return green;
      case 'By Level': // fall through
      default:
        if (setting('charger')) {
        // charger icon -> always make percentage readable
          if (P8.isPower() || l >= 50) return green;
        } else {
        // no icon -> brightest green to indicate charging, even when showing percentage
          if (P8.isPower()) return COLORS.charging;
          if (l >= 50) return COLORS.high;
        }
        if (l >= 15) return COLORS.ok;
        return COLORS.low;
    }
  }
  const chargerColor = () => {
    return (setting('color') === 'Monochrome') ? COLORS.white : COLORS.charging
  }
  // sets width, returns true if it changed
  function setWidth() {
    var w = 40;
    if (P8.isPower() && setting('charger'))
      w += 16;
    if (E.getBattery() > setting('hideifmorethan'))
      w = 0;
    var changed = WIDGETS["batpc"].width != w;
    WIDGETS["batpc"].width = w;
    return changed;
  }
  function draw() {
  // if hidden, don't draw
    if (!WIDGETS["batpc"].width) return;
    // else...
    var s = 39;
    var x = this.x, y = this.y;
    const l = E.getBattery(),
      c = levelColor(l);
    const xl = x+4+l*(s-12)/100

    if (P8.isPower() && setting('charger')) {
      g.setColor(chargerColor()).drawImage(atob(
        "DhgBHOBzgc4HOP////////////////////3/4HgB4AeAHgB4AeAHgB4AeAHg"),x,y);
      x+=16;
    }
    g.setColor(-1);
    g.fillRect(x,y+2,x+s-4,y+21);
    g.clearRect(x+2,y+4,x+s-6,y+19);
    g.fillRect(x+s-3,y+10,x+s,y+14);

    g.setColor(c).fillRect(x+4,y+6,xl,y+17);
    g.setColor(-1);
    if (!setting('percentage')) {
      return;
    }
    let gfx = g
    if (setting('color') === 'Monochrome') {
    // draw text inverted on battery level
      gfx = Graphics.createCallback(240, 240, 1,
        (x,y) => {g.setPixel(x,y,x<=xl?0:-1)})
    }
    gfx.setFontAlign(-1,-1);
    if (l >= 100) {
      gfx.setFont('4x6', 2);
      gfx.drawString(l, x + 6, y + 7);
    } else {
      if (l < 10) x+=6;
      gfx.setFont('6x8', 2);
      gfx.drawString(l, x + 6, y + 4);
    }
  }
  // reload widget, e.g. when settings have changed
  function reload() {
    loadSettings()
    // need to redraw all widgets, because changing the "charger" setting
    // can affect the width and mess with the whole widget layout
    setWidth()
    g.clear();
    P8.drawWidgets();
  }
  // update widget - redraw just widget, or all widgets if size changed
  function update() {
    if (setWidth()) P8.drawWidgets();
    else WIDGETS["batpc"].draw();
  }

  P8.on('power',function(charging) {
    if(charging) P8.buzz();
    update();
    g.flip();
  });
  var batteryInterval;
  WIDGETS["batpc"]={area:"tr",width:40,draw:draw,reload:reload};
  setWidth();
})()
