<!--
	WikiLambda Vue component for an individual input to be set for a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-editor-input-list-item" role="inputs-item-container">
		<div
			v-if="isMobile"
			class="ext-wikilambda-editor-input-list-item__header"
			:class="{ 'ext-wikilambda-editor-input-list-item__header--active': isActive }"
		>
			<cdx-button
				weight="quiet"
				class="ext-wikilambda-editor-input-list-item__header__action-expand"
				@click="toggleActive"
			>
				<cdx-icon :icon="icons.cdxIconExpand"></cdx-icon>
			</cdx-button>
			<span class="ext-wikilambda-editor-input-list-item__header__text">
				{{
					$i18n( 'wikilambda-function-viewer-details-input-number', inputNumber ).text() +
						( selectedLabel && !isActive ? ': ' + selectedLabel : '' )
				}}
			</span>
			<cdx-button
				v-if="canEditType"
				weight="quiet"
				class="ext-wikilambda-editor-input-list-item__header__action-delete"
				@click="removeInput"
			>
				<cdx-icon :icon="icons.cdxIconTrash"></cdx-icon>
			</cdx-button>
		</div>
		<div class="ext-wikilambda-editor-input-list-item__body">
			<span
				v-if="isMobile"
				class="ext-wikilambda-editor-input-list-item__body__description">
				{{ $i18n( 'wikilambda-function-definition-inputs-description' ).text() }}
				<a :href="getTypeUrl()"> {{ $i18n( 'wikilambda-function-definition-input-types' ).text() }} </a>
			</span>
			<div
				v-if="isMainLanguageBlock"
				class="ext-wikilambda-editor-input-list-item__body__entry"
			>
				<span
					v-if="index === 0 || isMobile"
					class="ext-wikilambda-editor-input-list-item__body__entry-text"
				>
					{{ $i18n( 'wikilambda-function-definition-input-item-type' ).text() }}
				</span>
				<wl-z-object-selector
					v-if="( !canEditType && getTypeOfArgument ) || canEditType"
					ref="typeSelector"
					class="
						ext-wikilambda-editor-input-list-item__body__entry-field
						ext-wikilambda-editor-input-list-item__selector"
					:disabled="!canEditType"
					:placeholder="$i18n( 'wikilambda-function-definition-inputs-item-selector-placeholder' ).text()"
					:row-id="getZArgumentType.id"
					:selected-zid="getTypeOfArgument"
					:type="Constants.Z_TYPE"
					@input="setArgumentType( $event )"
					@focus-out="clearIfUnset"
				></wl-z-object-selector>
				<!--
					TODO: This is hardcoded for now as it is the first complex input,
					In the future we should provide an UI that will allow user to define complex types
					automatically (for example set a function call that require x argument to be set
					and show them automatically)
				-->
				<wl-z-object-selector
					v-if="getTypeOfArgument === Constants.Z_TYPED_LIST"
					class="
						ext-wikilambda-editor-input-list-item__body__entry-field
						ext-wikilambda-editor-input-list-item__selector"
					:label="$i18n( 'wikilambda-function-definition-inputs-item-typed-list-placeholder' ).text()"
					:placeholder="$i18n( 'wikilambda-function-definition-inputs-item-typed-list-placeholder' ).text()"
					@input="setListTypedList"
					@clear="setListTypedList"
				></wl-z-object-selector>
			</div>
			<div class="ext-wikilambda-editor-input-list-item__body__entry">
				<span
					v-if="index === 0 || isMobile"
					class="ext-wikilambda-editor-input-list-item__body__entry-text"
				>
					{{ $i18n( 'wikilambda-function-definition-input-item-label' ).text() }}
				</span>
				<wl-text-input
					:model-value="getArgumentLabel"
					class="
						ext-wikilambda-editor-input-list-item__body__entry-field
						ext-wikilambda-editor-input-list-item__label"
					:placeholder="$i18n( 'wikilambda-function-definition-inputs-item-input-placeholder' ).text()"
					:aria-label="$i18n( 'wikilambda-function-definition-inputs-item-input-placeholder' ).text()"
					:max-chars="maxLabelChars"
					@input="handleInputChange"
				></wl-text-input>
				<!-- TODO: Add a character counter to tell users they can't write messages that are too long. -->
			</div>
			<cdx-button
				v-if="canEditType && !isMobile"
				weight="quiet"
				class="ext-wikilambda-editor-input-list-item__header__action-delete"
				:aria-label="$i18n( 'wikilambda-function-definition-inputs-item-remove' ).text()"
				@click="removeInput"
			>
				<cdx-icon :icon="icons.cdxIconTrash"></cdx-icon>
			</cdx-button>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	ZObjectSelector = require( '../../ZObjectSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	TextInput = require( '../../base/TextInput.vue' ),
	icons = require( './../../../../lib/icons.json' ),
	typeUtils = require( '../../../mixins/typeUtils.js' ),
	debounceSetArgumentLabelTimeout = 300;
// @vue/component
module.exports = exports = {
	name: 'wl-function-editor-inputs-item',
	components: {
		'wl-z-object-selector': ZObjectSelector,
		'cdx-icon': CdxIcon,
		'cdx-button': CdxButton,
		'wl-text-input': TextInput
	},
	mixins: [ typeUtils ],
	props: {
		index: {
			type: Number,
			required: true
		},
		zobjectId: {
			type: Number,
			required: true
		},
		/**
		 * If this input is in the main language block
		 */
		isMainLanguageBlock: {
			type: Boolean,
			required: true
		},
		/**
		 * if user has permissions to edit the input type
		 */
		canEditType: {
			type: Boolean,
			required: true
		},
		/**
		 * zID of item label language
		 *
		 * @example Z1014
		 */
		zLang: {
			type: String,
			required: true
		},
		/**
		 * device screensize is mobile
		 */
		isMobile: {
			type: Boolean,
			required: true
		},
		isActive: {
			type: Boolean,
			default: false
		},
		showIndex: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			debounceSetArgumentLabel: null,
			maxLabelChars: Constants.LABEL_CHARS_MAX,
			icons: icons
		};
	},
	computed: $.extend( mapGetters( [
		'getZLang',
		'getNextObjectId',
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getCurrentZLanguage',
		'getZObjectTypeById',
		'getLabel',
		'currentZObjectLanguages'
	] ), {
		inputNumber: function () {
			return this.showIndex ? this.index + 1 : '';
		},
		Constants: function () {
			return Constants;
		},
		getZArgumentType: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_ARGUMENT_TYPE
			] );
		},
		getTypeOfArgument: function () {
			var zArgumentTypeId = this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_ARGUMENT_TYPE
			] ).id;
			if ( this.getZObjectTypeById( zArgumentTypeId ) === Constants.Z_REFERENCE ) {
				return this.getNestedZObjectById( zArgumentTypeId, [
					Constants.Z_REFERENCE_ID
				] ).value;
			} else if ( this.getZObjectTypeById( zArgumentTypeId ) === Constants.Z_TYPED_LIST ) {
				return Constants.Z_TYPED_LIST;
			}
		},
		getArgumentLabels: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_ARGUMENT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			] );
		},
		getArgumentLabel: function () {
			var labels = this.getZObjectChildrenById( this.getArgumentLabels.id );
			for ( var index in labels ) {
				var lang = this.getNestedZObjectById( labels[ index ].id, [
						Constants.Z_MONOLINGUALSTRING_LANGUAGE,
						Constants.Z_REFERENCE_ID
					] ),
					value = this.getNestedZObjectById( labels[ index ].id, [
						Constants.Z_MONOLINGUALSTRING_VALUE,
						Constants.Z_STRING_VALUE
					] );
				if ( lang.value === this.zLang ) {
					return value.value;
				}
			}
			return null;
		},
		selectedLabel: function () {
			return this.getTypeOfArgument ? this.getLabel( this.getTypeOfArgument ) : '';
		}
	} ),
	methods: $.extend( mapActions( [
		'setZObjectValue',
		'changeType',
		'setTypeOfTypedList',
		'removeItemFromTypedList'
	] ), {
		setArgumentLabel: function ( input ) {
			if ( ( !this.getArgumentLabel && !this.getArgumentLabels.id ) || !this.zLang ) {
				return;
			}
			var lang = this.zLang;
			var labels = this.getZObjectChildrenById( this.getArgumentLabels.id );
			for ( var index in labels ) {
				var labelLang = this.getNestedZObjectById( labels[ index ].id, [
						Constants.Z_MONOLINGUALSTRING_LANGUAGE,
						Constants.Z_REFERENCE_ID
					] ),
					value = this.getNestedZObjectById( labels[ index ].id, [
						Constants.Z_MONOLINGUALSTRING_VALUE,
						Constants.Z_STRING_VALUE
					] );

				if ( labelLang.value === lang ) {
					this.setZObjectValue( {
						id: value.id,
						value: input
					} );
					this.$emit( 'update-argument-label' );
					return;
				}
			}
		},
		handleInputChange: function ( event ) {
			const input = event.target.value;
			clearTimeout( this.debounceSetArgumentLabel );
			this.debounceSetArgumentLabel = setTimeout( function () {
				this.setArgumentLabel( input );
			}.bind( this ), debounceSetArgumentLabelTimeout );
		},
		setArgumentType: function ( type ) {
			var payload;
			if ( type === Constants.Z_TYPED_LIST ) {
				payload = {
					id: this.getZArgumentType.id,
					type: Constants.Z_TYPED_LIST,
					unwrapped: true
				};
			} else {
				payload = {
					id: this.getZArgumentType.id,
					type: Constants.Z_REFERENCE,
					value: type
				};
			}
			this.changeType( payload );
		},
		setListTypedList: function ( type ) {
			var payload = {
				objectId: this.getZArgumentType.id,
				type: type
			};
			this.setTypeOfTypedList( payload );
		},
		toggleActive: function () {
			var index = this.isActive ? -1 : this.index;
			this.$emit( 'active-input', index );
		},
		clearIfUnset: function () {
			if ( !this.getTypeOfArgument ) {
				this.$refs.typeSelector.clearResults();
			}
		},
		removeInput: function () {
			this.removeItemFromTypedList( { rowId: this.zobjectId } );
		},
		getTypeUrl: function () {
			return new mw.Title( Constants.PATHS.LIST_OBJECTS_BY_TYPE_TYPE ).getUrl(
				{ uselang: this.getZLang }
			);
		}
	} ),
	watch: {
		zLang: {
			immediate: true,
			handler: function ( value ) {
				if ( value ) {
					const labels = this.getZObjectChildrenById( this.getArgumentLabels.id );
					for ( let index = 0; index < labels.length; index++ ) {
						const labelLang = this.getNestedZObjectById( labels[ index ].id, [
							Constants.Z_MONOLINGUALSTRING_LANGUAGE,
							Constants.Z_REFERENCE_ID
						] );
						if ( labelLang.value === value ) {
							return;
						}
					}
					// Add monoliguanl string to zobject if it does not already exist
					this.changeType( {
						type: Constants.Z_MONOLINGUALSTRING,
						lang: value,
						id: this.getArgumentLabels.id,
						append: true
					} );
				}
			}
		}
	}
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-editor-input-list-item {
	flex-direction: column;
	padding-bottom: @spacing-50;

	&__label {
		width: 100%;
	}

	&__body {
		width: 100%;
		display: none;
		flex-direction: column;
		margin-bottom: 0;
		align-items: flex-start;

		&__entry {
			display: flex;
			align-items: center;
			gap: @spacing-100;
			margin-bottom: @spacing-50;

			&-text {
				font-weight: @font-weight-bold;
			}

			&-field {
				flex: 1;
			}
		}

		&__description {
			opacity: 0.8;
			color: @color-subtle;
			font-size: @wl-font-size-description-mobile;
			line-height: @wl-line-height-description-mobile;
			letter-spacing: @wl-letter-spacing-description-mobile;
			display: inline-block;
			margin-bottom: @spacing-50;
		}
	}

	&__action-delete {
		.cdx-icon {
			width: @size-100;
			height: @size-100;
		}
	}

	&__header {
		display: flex;
		justify-content: space-between;
		width: 100%;

		&__text {
			flex-grow: 1;
			font-weight: @font-weight-bold;
			display: inline-block;
			line-height: @size-200;
			margin-left: @spacing-50;
		}

		&__action-expand {
			flex-grow: 0;

			.cdx-icon {
				width: @size-100;
				height: @size-100;
				transform: rotate( 180deg );
			}
		}

		&__action-delete {
			flex-grow: 0;

			.cdx-icon {
				width: @size-100;
				height: @size-100;
			}
		}

		&--active {
			.ext-wikilambda-editor-input-list-item__header__action-expand {
				.cdx-icon {
					transform: rotate( 0deg );
				}
			}

			+ .ext-wikilambda-editor-input-list-item__body {
				display: flex;
			}
		}
	}

	/* DESKTOP styles */
	@media screen and ( min-width: @width-breakpoint-tablet ) {
		padding: 0;
		flex-direction: row;
		border-bottom: 0;

		&:first-child {
			margin-top: 0;
		}

		&__row:first-of-type {
			.ext-wikilambda-editor-input-list-item__header__action-delete {
				margin-top: @spacing-200;
			}
		}

		&__body {
			display: flex;
			flex-direction: row;
			margin-bottom: @spacing-50;

			&__entry {
				margin-top: 0;
				margin-right: @spacing-50;
				display: block;
				margin-bottom: 0;

				&-text {
					display: block;
					line-height: @spacing-200;
				}
			}
		}

		&__selector {
			width: auto;
		}

		&__input {
			width: auto;
		}
	}
}
</style>
