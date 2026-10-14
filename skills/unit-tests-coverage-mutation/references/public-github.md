# Publication blockers

Use this file only when the user says that they will publish the repository on GitHub.
Do the secret scan before the other publication work.
Do the license check before the other publication work.
Write the README after that work and after any test work.
Write the ignore rules after that work and after any test work.

This order lets the README name a test command that exists.
This order lets the ignore rules include the new reports.
A stop in this file stops the whole request.

## Secrets and private data

Scan the tracked files before any cleanup.
Scan the tracked files before a change of visibility.
Scan the git history of the local checkout before any cleanup.
Scan the git history of the local checkout before a change of visibility.

Choose the scanner with the tool procedure.
Wait until the user approves the scanner.
Do not run the scanner before that approval.
Do not add the scanner to the manifest unless the approved design includes it.

A credential, a key, or a token stops the request.
When a credential, a key, or a token is present, name the paths.
When a credential, a key, or a token is present, tell the user to rotate that item.
Keep the finding.
Do not remove the finding as the fix.

If a remote has the secret, the secret is already compromised.
You do not fix the secret when you remove it from the current files.
A history rewrite does not reach a fork, a cache, or another clone.
Rewrite the history only when the user asks you and no remote has those commits.

When you find possible customer data, tell the user.
When you find an internal hostname, tell the user.
When you find possible customer data, keep it until the user agrees to a change.
When you find an internal hostname, keep it until the user agrees to a change.

The scan does not read hosted logs.
The scan does not read releases.
The scan does not read wikis.
The scan does not read forks.

Tell the user that the scan did not read those places.
Tell the user to enable secret scanning on GitHub.
Tell the user to enable push protection on GitHub.

## License

Code with no license is not open source.
The visibility of the repository does not change that fact.
A license can be a license file at the root of the project.
A license can be the license field that the manifest already has.

If the license file and the license field both exist and do not match, stop.
If the license file and the license field both exist and do not match, ask the user.
If no license exists, ask the user.

Do not choose a license.
Do not relicense code that the project does not own.
Do not check the license of a dependency.

## README and ignore rules

Do this step last.
Read [readme.md](readme.md) for the README edit.
That file supplies the project description, the advantages, the commands, the deduplication, and the review.

Add each coverage report to the ignore rules.
Add each HTML report to the ignore rules.
Add the mutation state to the ignore rules.
Add each local environment file to the ignore rules.

If git already tracks those files, untrack them.
Keep the editor settings in git.
Keep the project settings in git.
Do not commit the reports.
