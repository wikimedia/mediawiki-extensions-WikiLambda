<template>
	<!--
		WikiLambda Vue component for Z9/Reference objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-reference">
		<template v-if="!edit">
			<a
				class="ext-wikilambda-edit-link"
				:href="valueUrl">{{ valueLabel }}</a>
		</template>
		<template v-else>
			<wl-z-object-selector
				:selected-id="value"
				:initial-selection-label="valueLabel"
				:type="selectType"
				:zobject-id="rowId"
				:fit-width="true"
				@input="setValue"
			></wl-z-object-selector>
		</template>
	</div>
</template>

<script>
var
	Constants = require( '../../Constants.js' ),
	ZObjectSelector = require( './../ZObjectSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-reference',
	components: {
		'wl-z-object-selector': ZObjectSelector
	},
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
			type: String,
			default: ''
		}
	},
	data: function () {
		return {
		};
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
				return new mw.Title( this.value ).getUrl();
			},

			/**
			 * Returns the bound type to configure the ZObjectSelector
			 * if any, else returns an empty string.
			 *
			 * @return {string}
			 */
			selectType: function () {
				return this.expectedType === Constants.Z_OBJECT ?
					'' :
					this.expectedType;
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
