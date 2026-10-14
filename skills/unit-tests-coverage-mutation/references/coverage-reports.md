# Coverage reports

Write only the two outputs in this section.
Use the tool procedure when you choose the configuration or when you extend it.
Wait until the user approves the design.
Do not install the tool before that approval.
Do not connect the tool before that approval.

## Outputs

- Write one Cobertura file.
  Check that the file has a line rate.
  Check that the file has a count of valid lines.
  Check that the file has a path for each measured file.
  Check that the file has a hit count for each line.
- The file has branch data when the tool measured branches.
  When the branch rate is zero and the tool measured no branches, record the text "branches not measured".
- Write one HTML report.
  The report has an index page.
  A person can open that page on the local computer.
  Record that path.

Check that each path in the Cobertura file identifies a file in the worktree.
A path that is relative to the project is better.
An absolute path that has a prefix from another computer is a failed report.

The count of valid lines has the same magnitude as the code.
That code is the code that the user asks you to cover.
A rate near 100 percent with a very small count means that the include set is too small.
Increase the include set until it has the code that the user requested.
Do not decrease the include set so the rate increases.
Tell the user when the tool cannot count a file that the tests did not load.

Exclude generated code only with an exclusion rule that already exists.
Exclude vendored code only with an exclusion rule that already exists.
Do not add an exclusion to improve the number.

## How to write the reports

If the project already writes coverage, add the missing output to that configuration.
If the project writes a different machine-readable report, research a converter.
The converter writes that report as Cobertura.
Do not add a second instrumenter.
Do not write the Cobertura file manually.

If the project already has a report path, keep that path.
If the project has no report path, choose one stable Cobertura path.
Choose one directory for the HTML report.
Tell the user both paths.
These reports are products of the build.

Keep an existing failure threshold.
Do not add a new threshold that fails the build.
Do not upload the report.
Do not add a hosted coverage service.
Do not commit the report unless the user asks you to commit it.

Write one report for each project.
Merge the reports only with the merge function of the tool.
Merge the reports only when the inputs do not cover the same file twice.
Do not average the rates.
Do not add the rates manually.
