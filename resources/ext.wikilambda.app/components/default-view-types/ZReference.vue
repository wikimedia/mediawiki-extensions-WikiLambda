<!--
	WikiLambda Vue component for Z9/Reference objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-reference" data-testid="z-reference">
		<template v-if="!edit">
			<a
				v-if="valueLabel"
				class="ext-wikilambda-app-link"
				data-testid="edit-link"
				:lang="valueLabel.langCode"
				:dir="valueLabel.langDir"
				:href="valueUrl"
			>{{ valueLabel.label }}</a>
		</template>
		<template v-else>
			<wl-wikidata-reference-selector
				v-if="isWikidataEnumType"
				:disabled="disabled"
				:selected-zid="value"
				data-testid="z-reference-wikidata-reference-selector"
				@select-item="setValue"
			>
			</wl-wikidata-reference-selector>
			<wl-z-object-selector
				v-else
				:disabled="disabled"
				:row-id="rowId"
				:selected-zid="value"
				:type="type"
				:return-type="returnType"
				:exclude-zids="excludeZids"
				data-testid="z-reference-selector"
				@select-item="setValue"
			></wl-z-object-selector>
		</template>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );

const Constants = require( '../../Constants.js' );
const typeMixin = require( '../../mixins/typeMixin.js' );
const useMainStore = require( '../../store/index.js' );
const ZObjectSelector = require( './../base/ZObjectSelector.vue' );
const urlUtils = require( '../../utils/urlUtils.js' );
const WikidataReferenceSelector = require( './wikidata/ReferenceSelector.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-z-reference',
	components: {
		'wl-z-object-selector': ZObjectSelector,
		'wl-wikidata-reference-selector': WikidataReferenceSelector
	},
	mixins: [ typeMixin ],
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		},
		expectedType: {
			type: [ String, Object ],
			required: true
		},
		parentExpectedType: {
			type: [ String, Object ],
			required: false,
			default: Constants.Z_OBJECT
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	computed: Object.assign( {},
		mapState( useMainStore, [
			'getLabelData',
			'getParentRowId',
			'getZObjectKeyByRowId',
			'getZReferenceTerminalValue',
			'getUserLangCode'
		] ),
		{
			/**
			 * Returns the value of the selected reference.
			 *
			 * @return {string}
			 */
			value: function () {
				return this.getZReferenceTerminalValue( this.rowId );
			},

			/**
			 * Returns the string value of the label for the selected reference.
			 * If no label is found, returns undefined.
			 *
			 * @return {LabelData|undefined}
			 */
			valueLabel: function () {
				return this.value ? this.getLabelData( this.value ) : undefined;
			},

			/**
			 * Returns the link to the page of the selected reference.
			 *
			 * @return {string}
			 */
			valueUrl: function () {
				return urlUtils.generateViewUrl( {
					langCode: this.getUserLangCode,
					zid: this.value
				} );
			},

			/**
			 * Returns the bound type to configure the ZObjectSelector
			 * If `returnType` is not set and `expectedType` is a valid bound type (not `Z_OBJECT`),
			 * the bound type is returned as a string. Otherwise, returns an empty string.
			 * The type is converted to a string with no arguments if it is a generic type.
			 *
			 * @return {string} The bound type as a string, or an empty string if not applicable.
			 */
			type: function () {
				return this.returnType || !this.expectedType || this.expectedType === Constants.Z_OBJECT ?
					'' :
					this.typeToString( this.expectedType, true );
			},

			/**
			 * Returns the bound return type to configure the ZObjectSelector
			 * If `key` is `Z_FUNCTION_CALL_FUNCTION` and `parentExpectedType` is a valid bound type
			 * the bound return type is returned as a string. Otherwise, returns an empty string.
			 * We understand that the parent type is unbound when it expects Z1/Object or a
			 * resolver type (Z7/Function call, Z9/Reference, Z18/Argument reference), as they
			 * can resolve to anything.
			 * The type is converted to a string with no arguments if it is a generic type.
			 *
			 * @return {string} The bound return type as a string, or an empty string if not applicable.
			 */
			returnType: function () {
				const unboundTypes = [ Constants.Z_OBJECT, ...Constants.RESOLVER_TYPES ];
				return ( this.key === Constants.Z_FUNCTION_CALL_FUNCTION &&
					!unboundTypes.includes( this.parentExpectedType ) ) ?
					this.typeToString( this.parentExpectedType, true ) :
					'';
			},

			/**
			 * Returns the key that contains the reference value
			 * represented in this component.
			 *
			 * @return {string} The key associated with the reference value.
			 */
			key: function () {
				return this.getZObjectKeyByRowId( this.rowId );
			},

			/**
			 * Returns the key of the parent
			 *
			 * @return {string}
			 */
			parentKey: function () {
				return this.getZObjectKeyByRowId( this.getParentRowId( this.rowId ) );
			},

			/**
			 * Returns the list of excluded Zids to restrict in the lookup
			 * component depending on the current Key. Currently only for the
			 * content type of Z2K2, the keys from EXCLUDE_FROM_PERSISTENT_CONTENT
			 * are intentionally excluded.
			 *
			 * @return {Array}
			 */
			excludeZids: function () {
				return (
					( this.key === Constants.Z_OBJECT_TYPE ) &&
					( this.parentKey === Constants.Z_PERSISTENTOBJECT_VALUE )
				) ? Constants.EXCLUDE_FROM_PERSISTENT_CONTENT : [];
			},

			/**
			 * Returns true if the expected type is a Wikidata enum type.
			 *
			 * @return {boolean} True if the expected type is a Wikidata enum type, false otherwise.
			 */
			isWikidataEnumType: function () {
				return this.key === Constants.Z_WIKIDATA_ENUM_TYPE;
			}
		}
	),
	methods: {
		/**
		 * Emits the event setValue so that ZObjectKey can update
		 * the terminal value in the ZObject data table. ZObjectSelector
		 * input event will always be called with a valid value from the
		 * lookup list, never with an empty value.
		 *
		 * @param {string} value
		 */
		setValue: function ( value ) {
			const keyPath = ( this.key !== Constants.Z_REFERENCE_ID ) ?
				[ Constants.Z_REFERENCE_ID ] :
				[];
			this.$emit( 'set-value', { keyPath, value } );
		}
	}
} );

</script>
