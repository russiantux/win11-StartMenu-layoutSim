// Run: jsc -m tests/test-importers.mjs   (macOS JavaScriptCore)
import { classifyAppId, fromGetStartApps, fromStartJson, manualPin } from "../js/importers.js";

let fails = 0;
const check = (name, cond, extra = "") => {
  print((cond ? "PASS " : "FAIL ") + name + (cond ? "" : "  " + extra));
  if (!cond) fails++;
};
const j = (x) => JSON.stringify(x);

// classifyAppId
check("classify packaged", classifyAppId("Microsoft.WindowsCalculator_8wekyb3d8bbwe!App") === "packagedAppId");
check("classify lnk", classifyAppId("C:\\x\\Foo.LNK") === "desktopAppLink");
check("classify desktop id", classifyAppId("Microsoft.Windows.Explorer") === "desktopAppId");
check("classify exe path id", classifyAppId("{6D809377-6AF0-444B-8957-A3773F02200E}\\Foo\\foo.exe") === "desktopAppId");

// fromGetStartApps
const gsa = "\uFEFF" + j([
  { Name: "Calculator", AppID: "Microsoft.WindowsCalculator_8wekyb3d8bbwe!App" },
  { Name: "File Explorer", AppID: "Microsoft.Windows.Explorer" },
  { Name: "NoId" },
]);
let r = fromGetStartApps(gsa);
check("gsa: BOM + array", r.pins.length === 2, j(r));
check("gsa: missing AppID error", r.errors.length === 1 && /Skipped entry/.test(r.errors[0]), j(r.errors));
check("gsa: pin fields", r.pins[0].name === "Calculator" && r.pins[0].kind === "packagedAppId" && r.pins[0].value.endsWith("!App"), j(r.pins[0]));
check("gsa: desktop kind", r.pins[1].kind === "desktopAppId");
check("gsa: uid present+unique", r.pins[0].uid && r.pins[0].uid !== r.pins[1].uid);
check("gsa: icon app", r.pins[0].icon === "app", r.pins[0].icon);
r = fromGetStartApps(j({ Name: "Solo", AppID: "Solo.App" }));
check("gsa: single object", r.pins.length === 1 && r.pins[0].name === "Solo");
r = fromGetStartApps(j({ AppID: "Only.Id" }));
check("gsa: name falls back to AppID", r.pins[0]?.name === "Only.Id", j(r));
r = fromGetStartApps("not json");
check("gsa: bad json", r.pins.length === 0 && /^Not valid JSON/.test(r.errors[0] || ""), j(r));

// fromStartJson
const sj = j({
  applyOnce: true,
  pinnedList: [
    { packagedAppId: "Microsoft.WindowsCalculator_8wekyb3d8bbwe!App" },
    { packagedAppID: "Microsoft.Paint_8wekyb3d8bbwe!App" },
    { desktopAppLink: "%ALLUSERSPROFILE%\\Microsoft\\Windows\\Start Menu\\Programs\\Word.lnk" },
    { desktopAppId: "Microsoft.Windows.Explorer" },
    { secondaryTile: { tileId: "x" } },
  ],
});
r = fromStartJson(sj);
check("sj: count", r.pins.length === 4, j(r));
check("sj: applyOnce", r.applyOnce === true);
check("sj: capital ID normalised", r.pins[1].kind === "packagedAppId", j(r.pins[1]));
check("sj: secondaryTile error", r.errors.length === 1 && /secondaryTile/.test(r.errors[0]), j(r.errors));
check("sj: packaged name", r.pins[0].name === "WindowsCalculator", r.pins[0].name);
check("sj: link name", r.pins[2].name === "Word", r.pins[2].name);
check("sj: desktop id name", r.pins[3].name === "Explorer", r.pins[3].name);
r = fromStartJson("{oops");
check("sj: bad json", r.pins.length === 0 && r.errors.length === 1, j(r));
r = fromStartJson(j({ foo: 1 }));
check("sj: missing pinnedList is an error", r.pins.length === 0 && r.errors.length >= 1, j(r));

// manualPin
r = manualPin("  My App ", "packagedAppId", " Contoso.App_abc!App ");
check("manual: ok + trimmed", r.pins.length === 1 && r.pins[0].name === "My App" && r.pins[0].value === "Contoso.App_abc!App", j(r));
check("manual: empty name", manualPin("", "desktopAppId", "x").errors.length > 0);
check("manual: bad kind", manualPin("a", "nope", "x").errors.length > 0);
check("manual: empty value", manualPin("a", "desktopAppId", "  ").errors.length > 0);
check("manual: packaged needs !", manualPin("a", "packagedAppId", "Contoso.App").errors.length > 0);
check("manual: link needs .lnk", manualPin("a", "desktopAppLink", "C:\\x.exe").errors.length > 0);
check("manual: desktopAppId ok", manualPin("a", "desktopAppId", "Contoso.Tool").pins.length === 1);

print(fails ? `\n${fails} FAILED` : "\nALL PASS");
