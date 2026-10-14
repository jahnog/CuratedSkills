# Test cases

This file covers the inventory, the missing cases, and the reorganization.
Use the runner that the project already uses.

## Inventory

Record each case in the scope before you edit.
Record a local id.
Record the current name.
Record a pass or a fail.

Record the preconditions.
Record the action and the concrete inputs.
Record each expected result.
The path is only the current location of the case.

The identity of a case is that tuple.
Two copies of one tuple are one case.
A test that asserts two behaviors is two cases.

## Missing cases

Add a case only when the expected result has one of these sources.

- A written requirement.
- The name and the types of the operation.
- A neighboring test that already passes.
- A characterization.

A characterization records the behavior that you observe.
Label that record as an observation.
The observation does not state that the behavior is correct.
If the observation contradicts a name, a document, or another test, stop.
If the observation contradicts a name, a document, or another test, ask the user.

Prepare the candidates for the code that the user named.
Use the order below.

- Use one concrete value for each input class.
  You expect the inputs in one class to take the same path.
- For an ordered class, use the minimum value.
  Use the maximum value.
  Use the nearest value outside the limits.
- Assert the error path or the rejected path.
  Assert that result as the error or as the unchanged state.
- For a behavior that has state, write one case for each transition that the code claims.
  Write one case for a disallowed event.
  Assert that the state stays the same.

Do not record every combination of inputs.
Do not copy the production algorithm into the assertion.
Do not record a large snapshot.
Do not record a snapshot that is not deterministic.

Use a characterization for a complex document only when no other source exists.
When no other source exists, hide each part of that document that is not deterministic.
When no other source exists, ask the user to read the result before you use it as a case.
If you hide most of the document, ask the user.
If you hide most of the document, do not use the result as a case.

Keep each characterization narrow.
A narrow characterization records the behavior that you will change.
A narrow characterization does not record the whole program.

## Reorganization

You may do an edit below only when you keep each tuple.

- Name the test for the behavior.
- Divide a test that asserts two behaviors.
- Move a test from one file to another file.
- Move setup that is not an expected result into a helper.
- Use a helper for a repeated comparison.
  The helper compares the same values.
- Remove a second test only when its tuple matches another test and the summary records that match.

These edits are not a reorganization.

- You change an expected value.
- You remove an assertion.
- You accept more errors.
- You add a branch in a test.
- You change the production code.

Do one mechanical step of a reorganization.
Run the same suite after that step.
Do the next step after that run.

The suite passes before you start because a failed suite is a stop.
After a step, each test that passed before that step still passes.
A new failure in the step is a defect in the step.
Revert that step.
Do not remove the case.

The summary records each old id and the new id.
For a divided test, record which new case has each old expected result.
When two cases become one case, record that the two tuples were the same.
A tuple with no new id is a lost case.
The change is not complete.

Add cases in an edit that is separate from a reorganization.
