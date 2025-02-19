<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-input-setup">
		<div class="ext-wikilambda-app-function-input-setup__body">
			<div class="ext-wikilambda-app-function-input-setup__description">
				<!-- TODO (T387361): add langCode and langDir -->
				{{ functionDescription }}
			</div>
			<div class="ext-wikilambda-app-function-input-setup__fields">
				<cdx-field
					v-for="( input, index ) of inputFields"
					:key="input.key"
					class="ext-wikilambda-app-function-input-setup__field"
				>
					<!-- TODO (T383106): add select field for enums -->
					<cdx-text-input
						:placeholder="$i18n(
							'wikilambda-visualeditor-wikifunctionscall-dialog-string-input-placeholder' )"
						:model-value="functionCallArgs[ index ]"
						@update:model-value="setFunctionCallArg( index, $event )"
					></cdx-text-input>
					<template #label>
						<span
							:lang="input.labelData.langCode"
							:dir="input.labelData.langDir"
						>{{ input.labelData.label }}</span>
					</template>
				</cdx-field>
			</div>
		</div>
		<div class="ext-wikilambda-app-function-input-setup__footer">
			<cdx-icon :icon="icon"></cdx-icon>
			<!-- eslint-disable vue/no-v-html -->
			<span
				class="ext-wikilambda-app-function-input-setup__link"
				v-html="functionLink"
			></span>
		</div>
	</div>
</template>

<script>
const { CdxField, CdxIcon, CdxTextInput } = require( '../../../codex.js' );
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../../Constants.js' );
const icons = require( '../../../lib/icons.json' );
const useMainStore = require( '../../store/index.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-input-setup',
	components: {
		'cdx-field': CdxField,
		'cdx-icon': CdxIcon,
		'cdx-text-input': CdxTextInput
	},
	data: function () {
		return {
			// TODO (T373118): use color icon instead
			icon: icons.cdxIconLogoWikifunctions
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getDescription',
		'getInputsOfFunctionZid',
		'getLabelData',
		'getUserLangCode',
		'getVEFunctionId',
		'getVEFunctionParams'
	] ), {
		/**
		 * FIXME doc
		 *
		 * @return {string}
		 */
		functionZid: function () {
			return this.getVEFunctionId;
		},
		/**
		 * FIXME doc
		 *
		 * @return {string}
		 */
		functionUrl: function () {
			const wikifunctionsUrl = mw.config.get( 'wgWikifunctionsBaseUrl' ) || '';
			return `${ wikifunctionsUrl }/view/${ this.getUserLangCode }/${ this.functionZid }`;
		},
		/**
		 * FIXME doc
		 *
		 * @return {string}
		 */
		functionLink: function () {
			return this.$i18n(
				'wikilambda-visualeditor-wikifunctionscall-dialog-function-link-footer',
				this.functionZid
			).parse();
		},
		/**
		 * FIXME doc
		 *
		 * @return {string}
		 */
		functionDescription: function () {
			return this.getDescription( this.functionZid );
		},
		/**
		 * FIXME doc
		 *
		 * @return {Array}
		 */
		functionCallArgs: function () {
			// TODO (T383106) Validate enums
			// TODO (T387371) Validate types with parsers
			// Instead of directly passing the values set from Visual Editor,
			// we need to validate them first, because those param values might not
			// be valid. If they are not valid, show errors on load
			return Array.from(
				{ length: this.functionArguments.length },
				( _, index ) => this.getVEFunctionParams[ index ] || null
			);
		},
		/**
		 * FIXME doc
		 *
		 * @return {Array}
		 */
		functionArguments: function () {
			return this.getInputsOfFunctionZid( this.functionZid );
		},
		/**
		 * FIXME doc
		 *
		 * @return {Array}
		 */
		inputFields: function () {
			return this.functionArguments.map( ( arg ) => ( {
				key: arg[ Constants.Z_ARGUMENT_KEY ],
				expectedType: arg[ Constants.Z_ARGUMENT_TYPE ],
				labelData: this.getLabelData( arg[ Constants.Z_ARGUMENT_KEY ] )
			} ) );
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'setVEFunctionParam'
	] ), {
		/**
		 * FIXME doc
		 *
		 * @param {number} index
		 * @param {string} value
		 */
		setFunctionCallArg: function ( index, value ) {
			// TODO (T383106) Validate enums, if not valid show error
			// TODO (T387371) Validate types with parsers, if not valid show error
			this.setVEFunctionParam( index, value );
			this.$emit( 'update' );
		}
	} )
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-input-setup {
	.ext-wikilambda-app-function-input-setup__body {
		background-color: @background-color-neutral-subtle;
		padding: @spacing-75 @spacing-100 @spacing-100;
	}

	.ext-wikilambda-app-function-input-setup__description {
		margin-bottom: @spacing-75;
	}

	.ext-wikilambda-app-function-input-setup__footer {
		background-color: @background-color-base;
		padding: @spacing-75 @spacing-100;
	}

	.ext-wikilambda-app-function-input-setup__link {
		margin-left: @spacing-25;

		& > a {
			font-weight: @font-weight-bold;
		}
	}
}
</style>
