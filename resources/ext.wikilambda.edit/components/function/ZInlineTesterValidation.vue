<template>
	<div class="ext-wikilambda-inline-tester-validator">
		<z-object-selector
			v-if="!selectedFunction"
			:type="Constants.Z_FUNCTION"
			:placeholder="$i18n( 'wikilambda-function-typeselector-label' )"
			:selected-id="zFunctionId"
			@input="typeHandler"
		></z-object-selector>
		<template v-else>
			<sd-button
				v-if="!viewmode"
				:title="$i18n( 'wikilambda-editor-zobject-removekey-tooltip' )"
				destructive
				@click="typeHandler"
			>
				{{ $i18n( 'wikilambda-editor-removeitem' ) }}
			</sd-button>
			<z-reference
				:zobject-key="selectedFunction[ Constants.Z_PERSISTENTOBJECT_ID ]"
				search-type="Z8"
				:readonly="true"
			></z-reference>
		</template>
		<div class="ext-wikilambda-inline-tester-validator">
			<span v-for="argument in zFunctionArguments.slice(1)" :key="argument.key">
				{{ argument.label }}:
				<z-object-key
					:zobject-id="findArgumentId(argument.key)"
					:persistent="false"
					:parent-type="Constants.Z_FUNCTION_CALL"
					:z-key="argument.key"
				></z-object-key>
			</span>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZFunctionCall = require( '../types/ZFunctionCall.vue' );

module.exports = {
	extends: ZFunctionCall,
	computed: {
		firstArgument: function () {
			if ( this.zFunctionArguments.length > 1 ) {
				return this.zFunctionArguments[ 0 ];
			}

			return false;
		}
	},
	watch: {
		firstArgument: function () {
			if ( !this.firstArgument ) {
				return;
			}

			var firstArgumentId = this.findArgumentId( this.firstArgument.key ),
				zObject = this.getZObjectAsJsonById( firstArgumentId );

			if ( !zObject || zObject[ Constants.Z_REFERENCE_ID ] === 'Z20K2' ) {
				return;
			}

			this.injectZObject( {
				zobject: {
					Z1K1: Constants.Z_REFERENCE,
					Z9K1: 'Z20K2'
				},
				key: this.firstArgument.key,
				id: firstArgumentId,
				parent: this.zobjectId
			} );
		}
	}
};
</script>

<style lang="less">
	.ext-wikilambda-inline-tester-validator {
		display: inline;
	}
</style>
