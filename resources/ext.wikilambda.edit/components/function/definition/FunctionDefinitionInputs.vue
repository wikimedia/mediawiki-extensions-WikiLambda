<template>
	<!--
		WikiLambda Vue component for setting the inputs of a ZFunction in the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-inputs" role="inputs-container">
		<div
			v-if="!isMobile"
			:id="'ext-wikilambda-function-definition-inputs_label_' + zLang"
			class="ext-wikilambda-function-definition-inputs_label">
			<label
				class="ext-wikilambda-app__text-regular"
				aria-labelledby="wikilambda-function-definition-inputs-label"
			>
				{{ functionInputsLabel }}
			</label>
			<span class="ext-wikilambda-function-definition-inputs__description">
				{{ $i18n( 'wikilambda-function-definition-inputs-description' ).text() }}
				<a :href="getTypeUrl()"> {{ $i18n( 'wikilambda-function-definition-input-types' ).text() }} </a>
			</span>
			<tooltip
				v-if="tooltipMessage && !canEdit"
				:content="tooltipMessage"
			>
				<cdx-icon
					v-if="tooltipIcon"
					class="ext-wikilambda-function-definition-inputs_tooltip-icon"
					:icon="tooltipIcon">
				</cdx-icon>
			</tooltip>
		</div>
		<div
			:aria-labelledby="'ext-wikilambda-function-definition-inputs_label_' + zLang"
			class="ext-wikilambda-function-definition-inputs__inputs"
			:class="{ 'ext-wikilambda-function-definition-inputs__padded': isMainZObject }"
		>
			<function-definition-inputs-item
				v-for="( argument, index ) in zArgumentList"
				:key="argument.id"
				:index="index"
				class="ext-wikilambda-function-definition-inputs__row"
				:z-lang="zLang"
				:zobject-id="argument.id"
				:can-edit-type="canEditType"
				:is-mobile="isMobile"
				:is-active="activeInputIndex === index"
				:show-index="zArgumentList.length > 1"
				@update-argument-label="updateArgumentLabel"
				@active-input="setActiveInput">
			</function-definition-inputs-item>
			<div
				v-if="canEdit"
				:class="addInputButtonClass"
				role="button"
				@click="addNewItem">
				{{ addNewItemText }}
			</div>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	functionDefinitionInputsItem = require( './FunctionDefinitionInputsItem.vue' ),
	typeUtils = require( '../../../mixins/typeUtils.js' ),
	Tooltip = require( '../../base/Tooltip.vue' ),
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'function-definition-inputs',
	components: {
		'function-definition-inputs-item': functionDefinitionInputsItem,
		tooltip: Tooltip,
		'cdx-icon': CdxIcon
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			default: 0
		},
		isMainZObject: {
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
			activeInputIndex: this.isMainZObject ? 0 : -1
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
			return this.canEdit && this.isMainZObject;
		},
		addNewItemText: function () {
			return this.zArgumentList.length === 0 ?
				this.$i18n( 'wikilambda-function-definition-inputs-item-add-first-input-button' ).text() :
				this.$i18n( 'wikilambda-function-definition-inputs-item-add-input-button' ).text();
		},
		addInputButtonClass: function () {
			return this.zArgumentList.length === 0 ?
				'ext-wikilambda-function-definition-inputs__add-input-button ext-wikilambda-edit__text-button' :
				'ext-wikilambda-function-definition-inputs__add-another-input-button ext-wikilambda-edit__text-button';
		},
		functionInputsLabel: function () {
			return (
				this.$i18n( 'wikilambda-function-definition-inputs-label' ) +
				' (' +
				this.$i18n( 'wikilambda-optional' ) +
				') '
			);
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
		},
		// We need this function otherwise the build will fail
		showAddNewInput: function ( isMainZObject, index ) {
			return isMainZObject && index === this.zArgumentList.length - 1;
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
@import './../../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-definition-inputs {
	display: flex;
	margin-bottom: 26px;

	&_label {
		display: flex;
		flex-direction: column;
		width: 153px;
	}

	&__padded {
		padding-bottom: 40px;
	}

	& > div:first-of-type {
		width: 153px;
		flex-direction: column;
	}

	&_tooltip-icon {
		margin-left: 8px;
		width: 16px;
		height: 16px;
	}

	&__add-input-button {
		cursor: pointer;
	}

	&__add-another-input-button {
		margin-top: 8px;
		cursor: pointer;
	}

	&__description {
		color: @wmui-color-base20;
	}

	&__row {
		display: flex;
		gap: 8px;
	}

	@media screen and ( max-width: @width-breakpoint-tablet ) {
		display: block;

		&__row {
			display: block;
		}

		&__padded {
			padding-bottom: 0;
		}

		& > div:first-of-type {
			width: auto;
		}
	}
}
</style>
