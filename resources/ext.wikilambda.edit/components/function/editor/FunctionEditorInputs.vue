<template>
	<!--
		WikiLambda Vue component for setting the inputs of a ZFunction in the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-inputs" role="inputs-container">
		<div
			v-if="!isMobile"
			:id="'ext-wikilambda-function-definition-inputs__label_' + zLang"
			class="ext-wikilambda-function-definition-inputs__label">
			<div class="ext-wikilambda-function-definition-inputs__label-block">
				<label
					class="ext-wikilambda-app__text-regular"
					aria-labelledby="wikilambda-function-definition-inputs-label"
				>
					{{ $i18n( 'wikilambda-function-definition-inputs-label' ).text() }}
					<span>({{ $i18n( 'wikilambda-optional' ).text() }})</span>
				</label>
				<wl-tooltip
					v-if="tooltipMessage && !canEdit"
					:content="tooltipMessage"
				>
					<cdx-icon
						v-if="tooltipIcon"
						class="ext-wikilambda-function-definition-inputs__tooltip-icon"
						:icon="tooltipIcon">
					</cdx-icon>
				</wl-tooltip>
			</div>
			<span class="ext-wikilambda-function-definition-inputs__description">
				{{ $i18n( 'wikilambda-function-definition-inputs-description' ).text() }}
				<a :href="getTypeUrl()"> {{ $i18n( 'wikilambda-function-definition-input-types' ).text() }} </a>
			</span>
		</div>
		<div
			:aria-labelledby="'ext-wikilambda-function-definition-inputs__label_' + zLang"
			class="ext-wikilambda-function-definition-inputs__inputs"
			:class="{ 'ext-wikilambda-function-definition-inputs__padded': isMainLanguageBlock }"
		>
			<wl-function-editor-inputs-item
				v-for="( argument, index ) in zArgumentList"
				:key="argument.id"
				:index="index"
				class="ext-wikilambda-function-definition-inputs__row"
				:z-lang="zLang"
				:zobject-id="argument.id"
				:can-edit-type="canEditType"
				:is-mobile="isMobile"
				:is-active="activeInputIndex === index"
				:is-main-language-block="isMainLanguageBlock"
				:show-index="zArgumentList.length > 1"
				@update-argument-label="updateArgumentLabel"
				@active-input="setActiveInput"
			></wl-function-editor-inputs-item>
			<cdx-button
				v-if="canEdit"
				:class="addInputButtonClass"
				@click="addNewItem"
			>
				<cdx-icon :icon="icons.cdxIconAdd"></cdx-icon>
				{{ addNewItemText }}
			</cdx-button>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	FunctionEditorInputsItem = require( './FunctionEditorInputsItem.vue' ),
	typeUtils = require( '../../../mixins/typeUtils.js' ),
	Tooltip = require( '../../base/Tooltip.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( './../../../../lib/icons.json' ),
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'wl-function-editor-inputs',
	components: {
		'wl-function-editor-inputs-item': FunctionEditorInputsItem,
		'wl-tooltip': Tooltip,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			default: 0
		},
		isMainLanguageBlock: {
			type: Boolean
		},
		/**
		 * zID of item label language
		 *
		 * @example Z1014
		 *
		 */
		zLang: {
			type: String,
			default: ''
		},
		/**
		 * icon that will display a tooltip
		 */
		tooltipIcon: {
			type: [ String, Object ],
			default: null,
			required: false
		},
		/**
		 * if a user has permission to edit a function
		 */
		canEdit: {
			type: Boolean,
			default: false
		},
		/**
		 * message the tooltip displays
		 */
		tooltipMessage: {
			type: String,
			default: null
		},
		/**
		 * device screensize is mobile
		 */
		isMobile: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			icons: icons,
			activeInputIndex: this.isMainLanguageBlock ? 0 : -1
		};
	},
	computed: $.extend( mapGetters( [
		'getZObject',
		'getNextObjectId',
		'getAllItemsFromListById',
		'getNestedZObjectById'
	] ), {
		zFunctionId: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_IDENTITY,
				Constants.Z_REFERENCE_ID
			] ).value;
		},
		zArgumentId: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_ARGUMENTS
			] ).id || Constants.NEW_ZID_PLACEHOLDER;
		},
		zArgumentList: function () {
			return this.getAllItemsFromListById( this.zArgumentId );
		},
		canEditType: function () {
			return this.canEdit && this.isMainLanguageBlock;
		},
		addNewItemText: function () {
			return this.zArgumentList.length === 0 ?
				this.$i18n( 'wikilambda-function-definition-inputs-item-add-first-input-button' ).text() :
				this.$i18n( 'wikilambda-function-definition-inputs-item-add-input-button' ).text();
		},
		addInputButtonClass: function () {
			return this.zArgumentList.length === 0 ?
				'ext-wikilambda-function-definition-inputs__add-input-button' :
				'ext-wikilambda-function-definition-inputs__add-another-input-button';
		}
	} ),
	methods: $.extend( mapActions( [
		'addZObject',
		'addZArgument',
		'setAvailableZArguments'
	] ), {
		addNewItem: function ( /* event */ ) {
			var nextId = this.getNextObjectId,
				payload = {
					// since first item is type, new key is argmentList + 1
					key: `${this.zArgumentList.length + 1}`,
					value: 'object',
					parent: this.zArgumentId
				};

			this.addZObject( payload );

			var argumentPayload = {
				id: nextId,
				lang: this.zLang
			};
			this.addZArgument( argumentPayload );
			this.setActiveInput( this.zArgumentList.length - 1 );
		},
		// We need this function otherwise the build will fail
		showAddNewInput: function ( isMainLanguageBlock, index ) {
			return isMainLanguageBlock && index === this.zArgumentList.length - 1;
		},
		updateArgumentLabel: function () {
			this.setAvailableZArguments( this.zFunctionId );
			this.$emit( 'updated-argument-label' );
		},
		setActiveInput: function ( index ) {
			this.activeInputIndex = index;
		},
		getTypeUrl: function () {
			return new mw.Title( Constants.PATHS.LIST_ZOBJECTS_BY_TYPE_TYPE ).getUrl();
		}
	} ),
	watch: {
		zArgumentList: function () {
			this.setAvailableZArguments( this.zFunctionId );
		}
	},
	mounted: function () {
		this.setAvailableZArguments( this.zFunctionId );
	}
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-definition-inputs {
	display: flex;
	margin-bottom: @spacing-150;

	&__label-block {
		display: flex;
		align-items: center;

		& > label {
			line-height: @spacing-200;
			font-weight: @font-weight-bold;

			& > span {
				font-weight: @font-weight-normal;
			}
		}
	}

	&__label {
		display: flex;
		flex-direction: column;
		width: @wl-field-label-width;
		margin-right: @spacing-150;
	}

	& > div:first-of-type {
		width: @wl-field-label-width;
		flex-direction: column;
	}

	&__tooltip-icon {
		margin-left: @spacing-50;
		width: @size-100;
		height: @size-100;
	}

	&__description {
		opacity: 0.8;
		color: @color-subtle;
		font-size: @wl-font-size-description;
		line-height: @wl-line-height-description;
		display: inline-block;
	}

	&__row {
		display: flex;
		gap: @spacing-50;
	}

	/* DESKTOP styles */
	@media screen and ( min-width: @width-breakpoint-tablet ) {
		&__row:last-of-type {
			margin-bottom: @spacing-50;
		}

		&__row:first-of-type {
			.ext-wikilambda-editor-input-list-item__header__action-delete {
				margin-top: @spacing-200;
			}
		}
	}

	/* MOBILE styles */
	@media screen and ( max-width: @width-breakpoint-tablet ) {
		display: block;

		&__row {
			display: block;
		}

		&__label {
			& > label {
				line-height: inherit;
			}
		}

		&__description {
			margin-bottom: @spacing-50;
		}

		& > div:first-of-type {
			width: auto;
		}
	}
}
</style>
