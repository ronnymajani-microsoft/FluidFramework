/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { strict as assert } from "assert";
import { jsonString } from "../../../domains";
import {
	ChangesetLocalId,
	NodeChangeset,
	SequenceField as SF,
	singleTextCursor,
} from "../../../feature-libraries";
import { brand } from "../../../util";
import { deepFreeze } from "../../utils";

const id: ChangesetLocalId = brand(0);
const nodeX = { type: jsonString.name, value: "X" };
const nodeY = { type: jsonString.name, value: "Y" };
const content = [singleTextCursor(nodeX), singleTextCursor(nodeY)];
deepFreeze(content);

describe("SequenceField - Editor", () => {
	it("child change", () => {
		const childChange: NodeChangeset = { valueChange: { value: 1 } };
		deepFreeze(childChange);
		const actual = SF.sequenceFieldEditor.buildChildChange(42, childChange);
		const expected: SF.Changeset = [42, { type: "Modify", changes: childChange }];
		assert.deepEqual(actual, expected);
	});

	it("insert one node", () => {
		const actual = SF.sequenceFieldEditor.insert(42, content[0], id);
		const expected: SF.Changeset = [42, { type: "Insert", content: [nodeX], id }];
		assert.deepEqual(actual, expected);
	});

	it("insert multiple nodes", () => {
		const actual = SF.sequenceFieldEditor.insert(42, content, id);
		const expected: SF.Changeset = [42, { type: "Insert", content: [nodeX, nodeY], id }];
		assert.deepEqual(actual, expected);
	});

	it("delete", () => {
		const actual = SF.sequenceFieldEditor.delete(42, 3);
		const expected: SF.Changeset = [42, { type: "Delete", count: 3 }];
		assert.deepEqual(actual, expected);
	});
});
