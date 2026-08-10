/*!
 * WikiLambda unit test stand-in for the ext.communityConfiguration.Editor.controls module.
 *
 * CommunityConfiguration is a soft dependency, so its checkout is not there when the Jest suite of
 * this extension runs. This holds a small version of the parts of that module which our form
 * control uses, which also states plainly what our control depends on.
 *
 * Keeping the two in step is the job of the mutual CI dependency between the two extensions, and of
 * the test in CommunityConfiguration that renders a control from another extension. Do not add
 * anything here that the real module does not do.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { ref, computed, inject } = require( 'vue' );

/**
 * The props that every renderer takes.
 *
 * @return {Object} The prop definitions
 */
const rendererProps = () => ( {
	schema: {
		required: true,
		type: [ Object, Boolean ]
	},
	uischema: {
		required: true,
		type: Object
	},
	renderers: {
		required: false,
		type: Array,
		default: undefined
	}
} );

/**
 * The real one waits, then calls. Calling straight away keeps the tests free of timers, and the
 * waiting is not behaviour of this extension.
 *
 * @param {Function} fn
 * @return {Function}
 */
const debounce = ( fn ) => function ( ...args ) {
	return fn.apply( this, args );
};

/**
 * Bindings for a control of one property. The real one reads the value out of the form data by
 * JSON pointer; this one only handles a property at the top level, which is all our lists need.
 *
 * @param {Object} props
 * @return {{control: Object, handleChange: Function}}
 */
const useJsonFormControl = ( props ) => {
	const jsonform = inject( 'jsonform' );
	if ( !jsonform ) {
		throw new Error( "'jsonform' couldn't be injected. Are you within <JsonForm>?" );
	}
	const name = props.uischema.name;
	const pointer = `/${ name }`;

	return {
		control: Object.assign( {}, props, {
			modelValue: ref( jsonform.data[ name ] ),
			pointer,
			statusMessages: computed( () => (
				jsonform.errors && jsonform.errors[ pointer ] ?
					{ error: jsonform.errors[ pointer ] } :
					{}
			) ),
			otherAttrs: { required: props.uischema.required }
		} ),
		handleChange( newVal ) {
			jsonform.data[ name ] = newVal;
		}
	};
};

/**
 * Adds the Codex bindings. The control renders its own CdxField from controlWrapper, because a
 * CdxField of CommunityConfiguration cannot reach an input in a module of ours.
 *
 * @param {Object} input The result of useJsonFormControl()
 * @return {Object}
 */
const useCodexControl = ( input ) => Object.assign( {}, input, {
	onChange: ( newVal ) => {
		input.handleChange( newVal );
	},
	controlWrapper: {
		id: input.control.pointer,
		statusMessages: input.control.statusMessages,
		label: input.control.uischema.label,
		description: input.control.uischema.description,
		controlLabel: input.control.uischema.controlLabel,
		helpText: input.control.uischema.helpText
	}
} );

module.exports = exports = {
	debounce,
	rendererProps,
	useCodexControl,
	useJsonFormControl
};
