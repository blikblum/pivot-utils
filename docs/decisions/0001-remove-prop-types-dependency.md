# Remove prop-types dependency

* Status: accepted
* Deciders: blikblum
* Date: 2022-08-02

## Context and Problem Statement

prop-types is the only dependency and the provided value is at best questionable nowadays. Also is not compatible with esm.

## Considered Options

* Replace by other library
* Remove dependency

## Decision Outcome

Chosen option: "Remove dependency", because comes out best.

### Positive Consequences

* Smaller footprint

### Negative Consequences

* No logging when invalid options are passed
