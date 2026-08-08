const fs = require("fs");
const path = require("path");
const { interpolate } = require("flubber");

const pathValues = [
  "M500 370C550 370 600 320 600 270V100C600 50 650 0 700 0H1250H1820C1870 0 1920 50 1920 100V620C1920 670 1870 720 1820 720H1350C1300 720 1250 770 1250 820V980C1250 1030 1200 1080 1150 1080H100C50 1080 0 1030 0 980V470C0 420 50 370 100 370H500Z",
  "M60.171875 160.813C60.171875 105.5841 104.9434 60.8125 160.172 60.8125H621.744H1232.46H1760.17C1815.4 60.8125 1860.17 105.584 1860.17 160.813V698.223V920.813C1860.17 976.041 1815.4 1020.813 1760.17 1020.813H1232.46H160.172C104.9435 1020.813 60.171875 976.041 60.171875 920.813V390.538V160.813Z",
  "M60.171875 160.141C60.171875 104.9122 104.9434 60.140625 160.172 60.140625H521.744C576.972 60.140625 621.744 104.9122 621.744 160.141V289.866C621.744 345.095 666.515 389.866 721.744 389.866H1219.65H1760.17C1815.4 389.866 1860.17 434.638 1860.17 489.866V697.551V920.141C1860.17 975.369 1815.4 1020.141 1760.17 1020.141H1232.46H721.744C666.515 1020.141 621.744 975.369 621.744 920.141V593.064C621.744 537.836 576.972 493.064 521.744 493.064H160.172C104.9434 493.064 60.171875 448.292 60.171875 393.064V389.866V160.141Z"
];

const stepsPerTransition = 480;
const transitions = [];

for (let i = 0; i < pathValues.length - 1; i += 1) {
  const interpolator = interpolate(pathValues[i], pathValues[i + 1], {
    maxSegmentLength: 2,
    single: true
  });

  const steps = [];
  for (let step = 0; step <= stepsPerTransition; step += 1) {
    const t = step / stepsPerTransition;
    steps.push(interpolator(t));
  }
  transitions.push(steps);
}

const output = {
  stepsPerTransition,
  transitions
};

const outputDir = path.join(__dirname, "..", "src", "data", "morphs");
const outputFile = path.join(outputDir, "introS.json");

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(output));

console.log(`Generated morph steps: ${outputFile}`);
