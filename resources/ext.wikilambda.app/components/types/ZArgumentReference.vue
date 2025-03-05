<!--
	WikiLambda Vue component for Z18/Argument Reference objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-argument-reference"
		data-testid="z-argument-reference"
	>
		<template v-if="!edit">
			<cdx-icon :icon="icon"></cdx-icon>
			<span
				:lang="argumentLabelData.langCode"
				:dir="argumentLabelData.langDir"
			>{{ argumentLabelData.label }}</span>
		</template>
		<cdx-select
			v-else
			:selected="argumentKey"
			:menu-items="argumentOptions"
			:default-label="argumentSelectorPlaceholder"
			@update:selected="setValue"
		></cdx-select>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );

const Constants = require( '../../Constants.js' );
const zobjectMixin = require( '../../mixins/zobjectMixin.js' );
const useMainStore = require( '../../store/index.js' );
const icons = require( '../../../lib/icons.json' );

// Codex components
const { CdxIcon, CdxSelect } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-argument-reference',
	components: {
		'cdx-select': CdxSelect,
		'cdx-icon': CdxIcon
	},
	mixins: [ zobjectMixin ],
	props: {
		keyPath: { // eslint-disable-line vue/no-unused-properties
			type: String,
			required: true
		},
		objectValue: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			icon: icons.cdxIconFunctionArgument
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getLabelData',
		'getCurrentTargetFunctionZid',
		'getInputsOfFunctionZid'
	] ), {
		/**
		 * Returns the key of the selected argument reference,
		 * if any. Else, returns empty string.
		 *
		 * @return {string}
		 */
		argumentKey: function () {
			return this.key === Constants.Z_ARGUMENT_REFERENCE_KEY ?
				this.getZStringTerminalValue( this.objectValue ) :
				this.getZArgumentReferenceTerminalValue( this.objectValue );
		},

		/**
		 * Returns the label of the selected argument reference,
		 * if any. Else returns the argument reference key.
		 *
		 * @return {LabelData}
		 */
		argumentLabelData: function () {
			return this.getLabelData( this.argumentKey );
		},

		/**
		 * Returns the available argument references options
		 * formatted for the CdxSelect component.
		 * The options will be the union of all the argument references
		 * of the function being implemented in the current composition.
		 *
		 * @return {Array} Array of codex MenuItemData objects
		 */
		argumentOptions: function () {
			return this.getInputsOfFunctionZid( this.getCurrentTargetFunctionZid )
				.map( ( arg ) => ( {
					value: arg[ Constants.Z_ARGUMENT_KEY ],
					label: this.getLabelData( arg[ Constants.Z_ARGUMENT_KEY ] ).label,
					icon: icons.cdxIconFunctionArgument
				} ) );
		},

		/**
		 * Returns the placeholder for the argument reference selector
		 *
		 * @return {string}
		 */
		argumentSelectorPlaceholder: function () {
			return this.$i18n( 'wikilambda-argument-reference-selector-placeholder' ).text();
		}
	} ),
	methods: {
		/**
		 * Emits the event setValue so that ZObjectKey can update
		 * the terminal value in the ZObject data table. This component can
		 * be shown both in the collapsed version (hence set the value of the
		 * Z18K1->Z6K1 sequence of keys) or in the expanded one (hence just
		 * setting the string value Z6K1 of the current Z18K1 key).
		 *
		 * @param {string} value
		 */
		setValue: function ( value ) {
			let keyPath;
			if ( this.key === Constants.Z_ARGUMENT_REFERENCE_KEY ) {
				keyPath = [ Constants.Z_STRING_VALUE ];
			} else {
				keyPath = [
					Constants.Z_ARGUMENT_REFERENCE_KEY,
					Constants.Z_STRING_VALUE
				];
			}
			this.$emit( 'set-value', { keyPath, value } );
		}
	}
} );

</script>
