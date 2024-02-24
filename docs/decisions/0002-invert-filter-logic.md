# Invert Filter Logic

## Context and Problem Statement

When filtering, if the value of a record property is present in valueFilter, the record is excluded. This makes awkward to filter based in the value of one property: is necessary to add to the valueFilter all other possible values. Example, with a property 'key' whose possible values are 'a', 'b', 'c', to filter only key = 'a' is necessary to pass {valueFilter: {key: {'b': true, 'c': true}}}

## Considered Options

* Accept a record when the property value is present in value filter

## Decision Outcome

Chosen option: "Accept a record when the property value is present in value filter", because This improves DX and is the behavior from other libraries like lodash
