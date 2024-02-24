# Define ValueFilter Values as an Array Instead of an Object

## Context and Problem Statement

valueFilter values are defined as an object whose property name is the value to be filtered. It prevents differentiating values that are equal but not strictly equal e.g: 1 and '1'

## Considered Options

* Define valueFilter values as array
* Define valueFilter values as a Set

## Decision Outcome

Chosen option: "Define valueFilter values as array", because array is more compact than object and allows to use strict equality. While Set would be more performant, is not as easy to declare as array.
