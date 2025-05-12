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
				v-if="isWikidataEnum"
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
			 * Returns the bound type to configure the ZObjectSelector:
			 * * if expectedType is bound: return expectedType, converted to a string
			 *   with no arguments if it's a generic type (e.g. Z881 instead of Z881(Z6)).
			 * * if expected type is unbound (Z1, or a resolver type like Z7, Z9 or Z18):
			 *   return undefined
			 *
			 * @return {string|undefined}
			 */
			type: function () {
				const unboundTypes = [ Constants.Z_OBJECT, ...Constants.RESOLVER_TYPES ];
				return !unboundTypes.includes( this.expectedType ) ?
					this.typeToString( this.expectedType, true ) :
					undefined;
			},

			/**
			 * Returns the bound return type to configure the ZObjectSelector:
			 * * If key is Z7K1/Z_FUNCTION_CALL_FUNCTION, and function call return type is bound:
			 *   return parentExpectedType, converted to a string.
			 * * If key is Z7K1 but function call can return anything: return undefined
			 * * If key is not Z7K1: return undefined
			 *
			 * @return {string|undefined}
			 */
			returnType: function () {
				const unboundTypes = [ Constants.Z_OBJECT, ...Constants.RESOLVER_TYPES ];
				return ( this.key === Constants.Z_FUNCTION_CALL_FUNCTION &&
					!unboundTypes.includes( this.parentExpectedType ) ) ?
					this.typeToString( this.parentExpectedType, true ) :
					undefined;
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
			 * Returns the list of Zids to exclude from the ZObjectSelector lookup,
			 * depending on the current key and parent key.
			 * - For Z2K2 content type, excludes keys from EXCLUDE_FROM_PERSISTENT_CONTENT.
			 * - Excludes Wikidata enums unless selected as the direct parent of a ZObject/Z1
			 * and is the the key of a function call function (Z7K1).
			 * - For other cases, allows all.
			 *
			 * @return {Array}
			 */
			excludeZids: function () {
				if ( this.key === Constants.Z_OBJECT_TYPE &&
					this.parentKey === Constants.Z_PERSISTENTOBJECT_VALUE ) {
					return Constants.EXCLUDE_FROM_PERSISTENT_CONTENT;
				}
				if (
					this.key === Constants.Z_FUNCTION_CALL_FUNCTION &&
					this.parentKey === Constants.Z_PERSISTENTOBJECT_VALUE
				) {
					return [];
				}
				return [ Constants.Z_WIKIDATA_ENUM ];
			},

			/**
			 * Returns true if the key is a Wikidata enum type.
			 *
			 * @return {boolean}
			 */
			isWikidataEnum: function () {
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
