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
				:href="valueUrl">{{ valueLabel }}</a>
		</template>
		<template v-else>
			<wl-z-object-selector
				:edit="edit"
				:disabled="disabled"
				:row-id="rowId"
				:selected-zid="value"
				:type="selectType"
				data-testid="z-reference-selector"
				@input="setValue"
			></wl-z-object-selector>
		</template>
	</div>
</template>

<script>
const Constants = require( '../../Constants.js' ),
	ZObjectSelector = require( './../ZObjectSelector.vue' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
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
	computed: $.extend(
		mapGetters( [
			'getLabel',
			'getZObjectKeyByRowId',
			'getZReferenceTerminalValue'
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
				return '/view/' + ( mw.language.getFallbackLanguageChain()[ 0 ] || 'en' ) + '/' + this.value;
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
};

</script>
