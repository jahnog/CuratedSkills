# Tool choice

Use this procedure for each new tool.
This skill names no tool.

Do the four steps in this order.

1. Research the tool.
2. Design the tool.
3. Ask the user to approve the design.
4. Implement the tool.

Do not implement the tool in the same turn as the proposal.

## Research

Read the project before you research a source outside the project.
Extend a tool that the project already configures when that tool meets the criteria.
Do not add a second tool that measures the same thing.

When no tool meets the criteria, research the current official documentation.
Research the documentation of the stack in the project.
Research the documentation of the runner in the project.

Do not use a product name from memory as a source.
This skill gives no product name.
Do not invent a new framework.
If no candidate meets the criteria, stop.
Record the research.

## Design

Write a short proposal.
Include the items below.

- Include the tool that you recommend.
  Include the version.
- Include the reason that this tool fits the project better than the other candidates.
  Compare the tool only with candidates that you found.
- Include the criterion that the tool meets.
- Include each file that you will change.
- Include each part that you will not change.

Better means that the tool meets the written criteria.
Better means that the tool fits the existing project.
Do not use popularity as a criterion.
Do not replace a tool that meets the criteria unless you record which criterion it fails.

## Approval

Stop and ask the user to approve the design.
Do not install a new tool until the user approves the design.
Do not connect a new tool until the user approves the design.
Do not run a new tool until the user approves the design.

If the user chooses another candidate, use that candidate only when it meets the criteria.
If that candidate fails a criterion, tell the user which criterion fails.
Wait until the user decides.

## Implement

After the user approves the design, install the tool.
Use the dependency mechanism that the project already uses.
Install the tool as a development dependency.
Use the approved version.
If the approved design does not include the tool in the manifest, do not add the tool.
Do not add a publication scanner to the manifest unless the approved design includes it.

Install the tool inside the project.
Do not run a downloaded install script.
Do not use higher privileges for the install.

Read the help for the installed version.
Use a flag only when that help shows the flag.
Do not invent a flag.
If the documentation and the help do not match, use the installed help.
Tell the user that the two sources do not match.

Record the approved tool in the final report.
Record the version.
Record the criterion that the tool met.
Record the command that you ran.
Record the output paths.

A lockfile change after an approved install is expected.
Record that change.

Do not commit a report unless the user asks you to commit it.
Do not commit a cache unless the user asks you to commit it.
Do not commit the incremental state unless the user asks you to commit it.
