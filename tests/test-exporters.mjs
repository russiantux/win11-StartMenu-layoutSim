// Run: jsc -m tests/test-exporters.mjs   (macOS JavaScriptCore)
import { toStartJson, toTaskbarXml, OMA_URI } from "../js/exporters.js";

let fails = 0;
const check = (name, cond, extra = "") => {
  print((cond ? "PASS " : "FAIL ") + name + (cond ? "" : "  " + extra));
  if (!cond) fails++;
};

const pins = [
  { uid: "a", name: "Edge", kind: "desktopAppLink", value: "%ALLUSERSPROFILE%\\Microsoft\\Windows\\Start Menu\\Programs\\Microsoft Edge.lnk" },
  { uid: "b", name: "Calc", kind: "packagedAppId", value: "Microsoft.WindowsCalculator_8wekyb3d8bbwe!App" },
  { uid: "c", name: "Explorer", kind: "desktopAppId", value: "Microsoft.Windows.Explorer" },
  { uid: "d", name: "Bad", kind: "bogus", value: "x" },
  { uid: "e", name: "Empty", kind: "packagedAppId", value: "" },
  { uid: "f", name: "Amp", kind: "desktopAppLink", value: "C:\\A&B \"q\" <x>.lnk" },
];

// JSON
const pretty = toStartJson(pins);
const obj = JSON.parse(pretty);
check("json: no applyOnce by default", !("applyOnce" in obj), pretty);
check("json: skips bad/empty pins", obj.pinnedList.length === 4, String(obj.pinnedList.length));
check("json: pin shape", JSON.stringify(obj.pinnedList[1]) === '{"packagedAppId":"Microsoft.WindowsCalculator_8wekyb3d8bbwe!App"}', JSON.stringify(obj.pinnedList[1]));
check("json: pretty is indented", pretty.includes('\n  "pinnedList"'), pretty.slice(0, 40));
const min = toStartJson(pins, { minify: true, applyOnce: false });
check("json: minified single line", !min.includes("\n"));
check("json: applyOnce first key", min.startsWith('{"applyOnce":false,"pinnedList":['), min.slice(0, 40));
check("json: applyOnce true", JSON.parse(toStartJson(pins, { applyOnce: true })).applyOnce === true);

// XML
const xml = toTaskbarXml(pins);
check("xml: CRLF line endings", xml.includes("\r\n") && !/[^\r]\n/.test(xml));
check("xml: prolog", xml.startsWith('<?xml version="1.0" encoding="utf-8"?>'));
check("xml: Replace placement", xml.includes('<CustomTaskbarLayoutCollection PinListPlacement="Replace">'));
check("xml: UWA", xml.includes('<taskbar:UWA AppUserModelID="Microsoft.WindowsCalculator_8wekyb3d8bbwe!App" />'));
check("xml: DesktopApp link", xml.includes('DesktopApplicationLinkPath="%ALLUSERSPROFILE%\\Microsoft\\Windows\\Start Menu\\Programs\\Microsoft Edge.lnk"'));
check("xml: DesktopApp id", xml.includes('<taskbar:DesktopApp DesktopApplicationID="Microsoft.Windows.Explorer" />'));
check("xml: escaping", xml.includes('C:\\A&amp;B &quot;q&quot; &lt;x&gt;.lnk'), xml);
check("xml: skips bad pins", !xml.includes('"x"') && (xml.match(/<taskbar:(UWA|DesktopApp) /g) || []).length === 4);
check("xml: namespaces", ["LayoutModification", "FullDefaultLayout", "StartLayout", "TaskbarLayout"].every((n) => xml.includes(`http://schemas.microsoft.com/Start/2014/${n}"`)));

// Constants
check("oma: device", OMA_URI.device === "./Device/Vendor/MSFT/Policy/Config/Start/ConfigureStartPins");
check("oma: user", OMA_URI.user === "./User/Vendor/MSFT/Policy/Config/Start/ConfigureStartPins");

print(fails ? `\n${fails} FAILED` : "\nALL PASS");
