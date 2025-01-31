import React from "React"

import { TAssignmentFilter } from "@/types"

import { DropdownItem } from "./styled/Dropdown"

type Props = {
  obj: TAssignmentFilter
  setObj: React.Dispatch<React.SetStateAction<TAssignmentFilter>>
  inputLabel: string
  itemKey:
    | keyof TAssignmentFilter["type"]
    | keyof TAssignmentFilter["submit"]
    | keyof TAssignmentFilter["assessmentType"]
  section: keyof TAssignmentFilter
}

const AssignmentFilter: React.FC<Props> = (props) => {
  return (
    <DropdownItem>
      <input
        type="radio"
        name={props.section}
        checked={
          (props.obj[props.section] as { [key: string]: boolean })[
            props.itemKey
          ]
        }
        onChange={(event) => {
          const updatedSection = Object.keys(props.obj[props.section]).reduce(
            (acc, key) => ({
              ...acc,
              [key]: key === props.itemKey ? event.target.checked : false,
            }),
            {}
          )
          const updateObj = {
            ...props.obj,
            [props.section]: updatedSection,
          }
          props.setObj(updateObj)
        }}
      />
      {props.inputLabel}
    </DropdownItem>
  )
}

export default AssignmentFilter
