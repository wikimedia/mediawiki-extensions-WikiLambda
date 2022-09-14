<template>
	<!--
		WikiLambda Vue component for setting the inputs of a ZFunction in the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-inputs">
		<div class="ext-wikilambda-function-definition-inputs_label">
			<label class="ext-wikilambda-app__text-regular">
				{{ $i18n( 'wikilambda-function-definition-inputs-label' ) }}
			</label>
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
				:show-add-new-input="showAddNewInput( isMainZObject, index )"
				:can-edit-type="canEditType"
				:is-mobile="isMobile"
				:is-active="activeInputIndex === index"
				:show-index="zArgumentList.length > 1"
				@update-argument-label="updateArgumentLabel"
				@add-new-input="addNewItem"
				@active-input="setActiveInput">
			</function-definition-inputs-item>
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

			this.addZArgument( nextId );
		},
		// We need this function otherwise the build will fail
		showAddNewInput: function ( isMainZObject, index ) {
			return isMainZObject && index === 0;
		},
		updateArgumentLabel: function () {
			this.setAvailableZArguments( this.zFunctionId );
		},
		setActiveInput: function ( index ) {
			this.activeInputIndex = index;
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
	display: block;
	position: relative;
	margin-bottom: 26px;

	&__padded {
		padding-bottom: 40px;
	}

	& > div:first-of-type {
		width: 153px;
	}

	&_label {
		display: none;
	}

	&_tooltip-icon {
		margin-left: 8px;
		width: 16px;
		height: 16px;
	}

	@media screen and ( min-width: @width-breakpoint-tablet ) {
		display: flex;

		&__padded {
			padding-bottom: 0;
		}

		&_label {
			display: flex;
			flex: none;
		}
	}
}
</style>
