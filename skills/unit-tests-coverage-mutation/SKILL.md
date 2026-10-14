---
name: unit-tests-coverage-mutation
description: >
  Add, reorganize, or simplify unit tests and keep every case. Write
  Cobertura XML and HTML coverage reports, and run incremental mutation
  testing. Use this skill for that work in a local repository. When the
  user will publish the repository on GitHub, also scan the history for
  secrets, check the license, and make the README and ignore rules safe
  to publish. Do not use this skill for UI or end-to-end tests, diagnosing
  an existing failure, changing continuous integration, or writing
  production code from the tests.
license: MIT
---

# Unit tests, coverage, and mutation

Do only the work that the user asks you to do.
Work in the project that owns the named code.
A repository with several projects is not one suite.
If the user names no boundary and the request includes every test, ask the user to name a boundary.
Do not start the inventory before the user names that boundary.

When git is present, a diff may define the change.
When git is absent, the files that the user named are the change.
Missing git does not block the test work.
Missing git blocks a scan of the publication history.

## Publication

Do this work only when the user says that they will publish the repository on GitHub.
Read [references/public-github.md](references/public-github.md).

Choose the scanner with the tool procedure.
Read [references/tool-choice.md](references/tool-choice.md) when you choose a scanner.
Wait until the user approves the scan.
Do not run the scan before that approval.
The license check needs no new tool.

A secret stops the whole request.
A license stop stops the whole request.
Do no other edit before you complete the secret scan.
Do no other edit before you complete the license check.
Write the README after any test work.
Write the ignore rules after any test work.

## What already exists

Read the manifests.
Read the lockfiles.
Read the build files.
Read the commands that the project already runs.

Identify the stack from those files.
Identify the test runner from those files.
Identify any coverage configuration from those files.
Identify any mutation configuration from those files.
This skill does not list stacks.

Run the suite that the project already has.
Record a pass, a fail, or the absence of tests.
That run is not a tool choice.
That run does not need approval.

Read [references/tool-choice.md](references/tool-choice.md) before you write a proposal for a new tool.

## Stop the test work

These stops do not remove a secret finding.
These stops do not remove a license finding.
These stops do not forbid the final README step.

- Stop when the suite fails or is flaky and the user did not name that failure as the subject.
- Stop when both facts below are true.
  The observed result contradicts a name, a document, or another test.
  The user did not choose the intended behavior.
- Stop when no test runner exists.
  - Research the candidate runners.
  - Include one runner that is part of the toolchain.
  - That runner needs no new package.
  - Write the design.
  - Wait until the user approves the design.
  - Do not add a runner before that approval.
  - Do not start a runner before that approval.
- Stop when two runners already cover the same code.
  Ask the user which runner to extend.
  Do not add another runner.
  Do not move the tests from one runner to the other.
- Stop when the only way to make the suite pass is one of the edits below.
  You remove a case.
  You skip a case.
  You make a case weaker.
- Stop when the user asks you to measure coverage and the project has no tests.
  Tell the user that there is nothing to measure.
  Do not write an empty report as the result.
- Stop when the user asks you to run mutation and one fact below is true.
  The project has no unit tests.
  No tool meets the criteria in [references/mutation-testing.md](references/mutation-testing.md).
  Record the research.
  Do not start a full mutation run for that gap.
- Stop when no configuration can write both coverage reports and no converter can write the missing report.
  Record the gap.
  Do not write the report manually.

## Order

When the user asks you to do the whole test job, make each step a separate edit.
The suite passes before the next step starts.

1. Record an inventory of the cases in the scope.
   Read [references/test-cases.md](references/test-cases.md).
2. Add the missing cases.
3. Reorganize the tests in a later edit.
   That edit does not add cases.
4. Write both coverage reports.
   Read [references/coverage-reports.md](references/coverage-reports.md).
5. Run incremental mutation testing.
   Read [references/mutation-testing.md](references/mutation-testing.md).
6. When the user also asks you to publish, write the README.
   When the user also asks you to publish, write the ignore rules.
   Read [references/public-github.md](references/public-github.md).

If the user asks you to do only some of these steps, do only those steps.
Do the steps in the order above.

## Editing rules

Read [references/test-cases.md](references/test-cases.md) for the inventory and the full rules.

- Use the runner that the project already uses.
  Add a case only in that runner.
- Keep the production code the same unless the user asks you to change the behavior.
  A new test that fails is a finding.
- Keep each case.
  Do not remove a case to make the suite pass.
  Do not skip a case to make the suite pass.
  Do not make a case weaker to make the suite pass.
  Do not use those edits to increase coverage.
  Do not use those edits to increase the mutation score.
- Assert the result that a caller can observe.
  Do not call a private function unless the user asks you to call it.
  When the outcome is visible, assert that outcome.
  In that case, do not assert only a call to a collaborator.
- A reorganization keeps each case.
  The summary records the old case and the new case.

## Report

Record these items at the end.

- Record the project.
  Record the files that identify the runner.
- Record each case that you added.
  Record the source of each expected result.
  The source is a requirement, a name, a document, a neighboring test, or a labeled observation.
- Record each case that you moved.
  Record the old identity and the new identity.
  Record that the expected results are the same.
- Record each command that you ran.
- Record the path of the coverage report.
  Record the path of the HTML index.
  Record the results of the checks in the coverage file.
- Record the approved tool and the version.
  Record the mechanism.
  The mechanism is verdict reuse or change scope.
  Record the path of the state file.
  Record the scope.
  Record the misses that the tool documentation describes for a later run.
- Record publication results only when you did that work.
  Record each secret that you found.
  If you found no secret, record that fact.
  Record the status of the license.
  Record each change to the README.
  Record each change to the ignore rules.
- Record each refusal.
  Record the reason for the refusal.
