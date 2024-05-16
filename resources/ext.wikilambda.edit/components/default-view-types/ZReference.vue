<!--
	WikiLambda Vue component for Z9/Reference objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-reference">
		<template v-if="!edit">
			<a
				class="ext-wikilambda-edit-link"
				data-testid="edit-link"
				:href="valueUrl">{{ valueLabel }}</a>
		</template>
		<template v-else>
			<wl-z-object-selector
				:edit="edit"
				:disabled="disabled"
				:row-id="rowId"
				:selected-zid="value"
				:type="selectType"
				:exclude-zids="excludeZids"
				data-testid="z-reference-selector"
				@input="setValue"
			></wl-z-object-selector>
		</template>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const Constants = require( '../../Constants.js' ),
	ZObjectSelector = require( './../base/ZObjectSelector.vue' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = exports = defineComponent( {
	name: 'wl-z-reference',
	components: {
		'wl-z-object-selector': ZObjectSelector
	},
	mixins: [ typeUtils ],
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
		disabled: {
			type: Boolean,
			default: false
		}
	},
	computed: Object.assign(
		mapGetters( [
			'getLabel',
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
			 * @return {string|undefined}
			 */
			valueLabel: function () {
				return this.value ? this.getLabel( this.value ) : undefined;
			},

			/**
			 * Returns the link to the page of the selected reference.
			 *
			 * @return {string}
			 */
			valueUrl: function () {
				return '/view/' + this.getUserLangCode + '/' + this.value;
			},

			/**
			 * Returns the bound type to configure the ZObjectSelector
			 * if any, else returns an empty string. The type must be
			 * converted to string with no args in case it's a generic type.
			 *
			 * @return {string}
			 */
			selectType: function () {
				return !this.expectedType || ( this.expectedType === Constants.Z_OBJECT ) ?
					'' :
					this.typeToString( this.expectedType, true );
			},

			/**
			 * Returns the key that contains the reference value
			 * represented in this component.
			 *
			 * @return {string}
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
			}
		}
	),
	methods: {
		/**
		 * Emits the event setValue so that ZObjectKey can update
		 * the terminal value in the ZObject data table.
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
