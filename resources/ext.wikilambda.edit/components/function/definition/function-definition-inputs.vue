<template>
	<!--
		WikiLambda Vue component for setting the inputs of a ZFunction in the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-inputs">
		<div>
			<label class="ext-wikilambda-app__text-regular">
				{{ $i18n( 'wikilambda-function-definition-inputs-label' ) }}
			</label>
		</div>

		<div class="ext-wikilambda-function-definition-inputs__inputs">
			<function-definition-inputs-item
				v-for="( argument, index ) in zArgumentList"
				:key="argument.id"
				:index="index"
				class="ext-wikilambda-function-definition-inputs__row"
				:zobject-id="argument.id"
				@add-new-input="addNewItem">
			</function-definition-inputs-item>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	functionDefinitionInputsItem = require( './function-definition-inputs-item.vue' ),
	typeUtils = require( '../../../mixins/typeUtils.js' ),
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = {
	name: 'FunctionDefinitionInputs',
	components: {
		'function-definition-inputs-item': functionDefinitionInputsItem
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			default: 0
		}
	},
	data: function () {
		return {
			Constants: Constants
		};
	},
	computed: $.extend( mapGetters( [
		'getNextObjectId',
		'getZObjectChildrenById',
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
			] ).id;
		},
		zArgumentList: function () {
			return this.getZObjectChildrenById( this.zArgumentId );
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
					key: this.zArgumentList.length,
					value: 'object',
					parent: this.zArgumentId
				};
			this.addZObject( payload );

			this.addZArgument( nextId );
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
	margin-bottom: 26px;

	& > div:first-of-type {
		width: 153px;
	}
}
</style>
