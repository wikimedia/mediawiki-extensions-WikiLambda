<template>
	<!--
		WikiLambda Vue component for Z9/Reference objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-reference">
		<template v-if="!edit">
			<a :href="valueUrl">{{ valueLabel }}</a>
		</template>
		<template v-else>
			<z-object-selector
				v-if="isValueReady"
				:class="selectorClass"
				:selected-id="value"
				:initial-selection-label="valueLabel"
				:type="selectType"
				:zobject-id="rowId"
				@input="setValue"
				@focus="setSelectorClassActive"
				@focus-out="removeSelectorClassActive"
			></z-object-selector>
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
	name: 'z-reference',
	components: {
		'z-object-selector': ZObjectSelector
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
			selectorClass: 'ext-wikilambda-reference__selector'
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
			 * Returns the value of the selected reference
			 *
			 * @return {string}
			 */
			value: function () {
				return this.getZReferenceTerminalValue( this.rowId );
			},

			/**
			 * Returns the label object for the selected reference or undefined
			 * if no label is found.
			 * TODO implement Label class and update JSDoc
			 *
			 * @return {Object|undefined}
			 */
			valueLabelObj: function () {
				return this.value ? this.getLabel( this.value ) : undefined;
			},

			/**
			 * Returns the string value of the label for the selected reference.
			 * If no label is found, returns the key.
			 *
			 * @return {string}
			 */
			valueLabel: function () {
				return this.valueLabelObj ? this.valueLabelObj.label : this.value;
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
			 * Returns whether the value and its value label are ready
			 *
			 * @return {boolean}
			 */
			isValueReady: function () {
				// It is necessary that CdxLookup select and initialInputValue are
				// both set before rendering the component. If select is set and its
				// label (initialInputValue) hasn't been fetched yet, the text value
				// in the component will be the one passed in the select parameter.
				// For this reason we don't render the component until we have both
				// values.
				// TODO: move this functionality into inside of the ZObjectSelector
				// component so that it can be used from outside without being
				// concerned about this. In fact, every ZObjectSelector is used for
				// ZObjects and the important value is the zid. We shouldn't have to
				// pass in the initializing label at all.
				return this.value ? !!this.valueLabelObj : true;
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
		},

		setSelectorClassActive: function () {
			this.selectorClass = 'ext-wikilambda-reference__selector-active';
		},

		removeSelectorClassActive: function () {
			this.selectorClass = 'ext-wikilambda-reference__selector';
		}
	}
};

</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-reference {
	&__selector-active {
		.cdx-lookup {
			width: 100%;
			display: inline-block;
		}

		@media screen and ( min-width: @width-breakpoint-tablet ) {
			.cdx-lookup {
				width: 50%;
				display: inline-block;
			}
		}
	}

	&__selector {
		.cdx-lookup {
			width: auto;
			display: inline-block;
		}
	}
}

</style>
