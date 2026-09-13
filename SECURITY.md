# Security Policy

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Email **info@molecare.co.uk**, or open a private
[security advisory](https://github.com/MoleCare/rn-scale-reference/security/advisories/new)
on this repository, with:

- what the issue is and where in the code it lives
- how to reproduce it
- what an attacker could do with it

You should get an acknowledgement within **3 working days**. We will tell you
when a fix is released and credit you in the release notes, unless you would
rather we did not.

## Supported versions

Security fixes go into the latest release.

## Scope

This package is pure arithmetic: it reads no files, makes no network calls and
stores nothing. In scope are bugs that make it return a confident number where
it should refuse (a wrong result that looks right), and anything reachable in
its dependencies.

Out of scope here (but still worth telling us about at the same address): the
MoleCare apps and API.

Never include a real photo of a person, or any health data, in a report.
