<template>
	<!--
		WikiLambda Vue component for ZFunctionCall objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div v-if="selectedFunction" class="ext-wikilambda-function-call-block ext-wikilambda-function-call-block__runner">
		{{ zFunctionCallKeyLabels[ Constants.Z_FUNCTION_CALL_FUNCTION ] }}:
		<z-reference
			:zobject-key="selectedFunctionPersistentValue"
			:search-type="Constants.Z_FUNCTION"
			:readonly="true"
		></z-reference>
		<ul>
			<li v-for="argument in zFunctionArguments" :key="argument.key">
				{{ argument.label }}:
				<z-object-key
					:zobject-id="findArgumentId( argument.key )"
					:persistent="false"
					:parent-type="Constants.Z_FUNCTION_CALL"
					:z-key="argument.key"
				></z-object-key>
			</li>
		</ul>
		<button @click="callFunctionHandler">
			<label> {{ $i18n( 'wikilambda-call-function' ) }} </label>
		</button>
		<div v-if="resultZObject || orchestrating" class="ext-wikilambda-orchestrated-result">
			<template v-if="resultZObject">
				<span>{{ $i18n( 'wikilambda-orchestrated' ) }}</span>
				<z-key-mode-selector
					:mode="orchestratedMode"
					:parent-type="Constants.Z_FUNCTION_CALL"
					:available-modes="displayModes"
					@change="orchestratedMode = $event"
				></z-key-mode-selector>
				<div>
					<z-object-json
						v-if="orchestratedMode === Constants.Z_KEY_MODES.JSON"
						:readonly="true"
						:zobject-id="resultId"
					></z-object-json>
					<z-object-key
						v-else
						:zobject-id="resultId"
						:parent-type="Constants.Z_RESPONSEENVELOPE"
						:readonly="true"
					></z-object-key>
				</div>
			</template>
			<template v-else-if="orchestrating">
				<em>{{ $i18n( 'wikilambda-orchestrated-loading' ) }}</em>
			</template>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZFunctionCall = require( '../types/ZFunctionCall.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	extends: ZFunctionCall,
	provide: function () {
		return {
			viewmode: false
		};
	},
	computed: mapGetters( {
		getCurrentZObjectType: 'getCurrentZObjectType',
		getZObjectAsJson: 'getZObjectAsJson'
	} ),
	methods: {
		callFunctionHandler: function () {
			var self = this,
				ZfunctionObject;

			ZfunctionObject = this.getZObjectAsJsonById( this.zobjectId );

			if ( this.getCurrentZObjectType === Constants.Z_IMPLEMENTATION ) {
				var zFunctionId = this.getZObjectAsJson.Z2K2.Z14K1.Z9K1;
				ZfunctionObject.Z7K1 = this.getZkeys[ zFunctionId ].Z2K2;

				ZfunctionObject.Z7K1.Z8K4 = [ this.getZObjectAsJson.Z2K2 ];
			}

			this.orchestrating = true;

			this.initializeResultId( this.resultId )
				.then( function ( resultId ) {
					self.resultId = resultId;

					return self.callZFunction( { zobject: ZfunctionObject, resultId: self.resultId } );
				} )
				.then( function () {
					self.orchestrating = false;
				} );
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-function-call-block__runner {
	max-width: 40vw;

	@media ( max-width: 1200px ) {
		max-width: 100%;
	}
}
</style>
