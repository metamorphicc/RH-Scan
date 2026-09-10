import assert from "node:assert/strict";
import test from "node:test";
import fixtures from "./rules.fixtures.json";
import { evaluate, type RuleSnapshot, type Verdict } from "../lib/rules";

type RuleFixture = {
  name: string;
  expectedVerdict: Verdict;
  snapshot: RuleSnapshot;
};

for (const fixture of fixtures as RuleFixture[]) {
  test(fixture.name, () => {
    const result = evaluate(fixture.snapshot);

    assert.equal(result.verdict, fixture.expectedVerdict);
    assert.ok(result.flags.every((flag) => flag.code.length > 0));
  });
}

test("unknown mint never returns ok to size small", () => {
  const fixture = (fixtures as RuleFixture[]).find(
    (item) => item.name === "unknown authority stays thin",
  );

  assert.ok(fixture);
  assert.notEqual(evaluate(fixture.snapshot).verdict, "ok to size small");
});

