import React from "React"

import { TAssignmentFilter } from "@/types"

import { DropdownItem } from "./styled/Dropdown"

type Props = {
  obj: TAssignmentFilter
  setObj: React.Dispatch<React.SetStateAction<TAssignmentFilter>>
  inputLabel: string
  itemKey: keyof TAssignmentFilter
}

const AssignmentFilter: React.FC<Props> = (props) => {
  return (
    <DropdownItem htmlFor={props.itemKey}>
      <input
        id={props.itemKey}
        type="checkbox"
        defaultChecked={props.obj[props.itemKey]}
        onChange={() => {
          props.setObj({
            ...props.obj,
            [props.itemKey]: !props.obj[props.itemKey],
          })
        }}
      />
      {props.inputLabel}
    </DropdownItem>
  )
}

export default AssignmentFilter
