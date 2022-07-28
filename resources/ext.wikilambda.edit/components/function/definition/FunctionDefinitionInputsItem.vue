<template>
	<!--
		WikiLambda Vue component for an individual input to be set for a ZFunction in the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-editor-input-list-item">
		<div
			v-if="isMobile"
			class="ext-wikilambda-editor-input-list-item__header"
			:class="{ 'ext-wikilambda-editor-input-list-item__header--active': isActive }"
		>
			<cdx-button
				type="quiet"
				class="ext-wikilambda-editor-input-list-item__header__title"
				@click="toggleActive"
			>
				<cdx-icon :icon="icons.cdxIconExpand"></cdx-icon>
				<span
					class="ext-wikilambda-editor-input-list-item__header__title__text"
				>
					{{
						$i18n( 'wikilambda-function-viewer-details-input-number', inputNumber ) +
							( selectedLabel && !isActive ? ': ' + selectedLabel : '' )
					}}
				</span>
			</cdx-button>

			<cdx-button
				v-if="index !== 0 && canEditType"
				type="quiet"
				class="ext-wikilambda-editor-input-list-item__header__action-delete"
			>
				<cdx-icon :icon="icons.cdxIconTrash"></cdx-icon>
			</cdx-button>
		</div>

		<div class="ext-wikilambda-editor-input-list-item__body">
			<z-object-selector
				:type="Constants.Z_TYPE"
				class="ext-wikilambda-editor-input-list-item__selector"
				:placeholder="$i18n( 'wikilambda-function-definition-inputs-item-selector-placeholder' ).text()"
				:selected-id="getTypeOfArgument"
				:initial-selection-label="selectedLabel"
				:readonly="!canEditType"
				@input="setArgumentType( $event )"
			></z-object-selector>
			<!--
				TODO: This is hardcoded for now as it is the first complex input,
				In the future we should provide an UI that will allow user to define complex types
				automatically (for example set a function call that require x argument to be set
				and show them automatically)
			-->
			<z-object-selector
				v-if="getTypeOfArgument === Constants.Z_TYPED_LIST"
				class="ext-wikilambda-editor-input-list-item__selector"
				:label="$i18n( 'wikilambda-function-definition-inputs-item-typed-list-placeholder' ).text()"
				:placeholder="$i18n( 'wikilambda-function-definition-inputs-item-typed-list-placeholder' ).text()"
				@input="setListTypedList"
				@clear="setListTypedList"
			>
			</z-object-selector>

			<input
				class="ext-wikilambda-editor-input-list-item__input"
				:placeholder="$i18n( 'wikilambda-function-definition-inputs-item-input-placeholder' ).text()"
				:aria-label="$i18n( 'wikilambda-function-definition-inputs-item-input-placeholder' ).text()"
				:value="getArgumentLabel"
				@input="setArgumentLabel( zobjectId, $event.target.value )"
			>
		</div>
		<template v-if="showAddNewInput">
			<div
				class="ext-wikilambda-editor-input-list-item__button ext-wikilambda-edit__text-button"
				role="button"
				@click="$emit( 'add-new-input' )">
				{{ $i18n( 'wikilambda-function-definition-inputs-item-add-input-button' ).text() }}
			</div>
		</template>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	ZObjectSelector = require( '../../ZObjectSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	icons = require( './../../../../lib/icons.json' ),
	typeUtils = require( '../../../mixins/typeUtils.js' );

// @vue/component
module.exports = exports = {
	name: 'function-definition-inputs-item',
	components: {
		'z-object-selector': ZObjectSelector,
		'cdx-icon': CdxIcon,
		'cdx-button': CdxButton
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
		 * if user has permissions to add new input
		 */
		showAddNewInput: {
			type: Boolean
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
			icons: icons
		};
	},
	computed: $.extend( mapGetters( [
		'getNextObjectId',
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getCurrentZLanguage',
		'getZObjectTypeById',
		'getZkeyLabels'
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
			return this.getTypeOfArgument ? this.getZkeyLabels[ this.getTypeOfArgument ] : '';
		}
	} ),
	methods: $.extend( mapActions( [
		'setZObjectValue',
		'addZMonolingualString',
		'changeType',
		'setTypeOfTypedList'
	] ), {
		setArgumentLabel: function ( id, input ) {
			if ( !this.getArgumentLabel && !this.getArgumentLabels.id ) {
				return;
			}

			var lang = this.zLang || this.getCurrentZLanguage;

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
					return;
				}
			}

			// Add new language
			var nextId = this.getNextObjectId,
				newLang = lang,
				zLabelParentId = this.getArgumentLabels.id;

			this.addZMonolingualString( {
				lang: newLang,
				parentId: zLabelParentId
			} ).then( function () {
				var newMonolingualString = this.getNestedZObjectById( nextId, [
					Constants.Z_MONOLINGUALSTRING_VALUE,
					Constants.Z_STRING_VALUE
				] );

				this.setZObjectValue( {
					id: newMonolingualString.id,
					value: input
				} );
			}.bind( this ) );
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
		}
	} )
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';
@import './../../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-editor-input-list-item {
	flex-direction: column;
	gap: 20px;
	padding: 24px 0;
	border-bottom: 1px solid @wmui-color-base80;

	&__body {
		width: 100%;
		display: none;
		flex-direction: column;
		gap: 20px;
	}

	&__header {
		display: flex;
		justify-content: space-between;
		width: 100%;

		&__title {
			display: flex;
			align-items: center;
			gap: 8px;
			width: 100%;
			padding: 0;

			.cdx-icon {
				width: 30px;
				height: 30px;
				transform: rotate( 180deg );

				svg {
					width: 16px;
				}
			}

			&__text {
				font-weight: @font-weight-normal;
			}
		}

		&__action-delete {
			.cdx-icon {
				color: @wmui-color-red50;
				width: 16px;
				height: 16px;
			}
		}

		&--active {
			.ext-wikilambda-editor-input-list-item__header__title {
				.cdx-icon {
					transform: rotate( 0deg );
				}
			}

			+ .ext-wikilambda-editor-input-list-item__body {
				display: flex;
			}
		}
	}

	&__selector {
		height: 34px;
		width: 100%;
	}

	&__input {
		height: 36px;
		width: 100%;
		padding: 0 6px;
		box-sizing: border-box;
	}

	&__button {
		white-space: nowrap;
		cursor: pointer;
		position: absolute;
		bottom: 0;
		left: 0;
	}

	@media screen and ( min-width: @width-breakpoint-tablet ) {
		padding: 0;
		flex-direction: row;
		margin-bottom: 6px;
		border-bottom: 0;

		&__body {
			display: flex;
			flex-direction: row;
			gap: 6px;
		}

		&__selector {
			width: auto;
		}

		&__input {
			width: auto;
		}

		&__button {
			position: relative;
		}
	}
}
</style>
