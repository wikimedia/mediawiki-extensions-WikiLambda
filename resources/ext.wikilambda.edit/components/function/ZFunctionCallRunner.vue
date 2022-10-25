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
				<z-object-key
					:zobject-id="findArgumentId( argument.key )"
					:persistent="false"
					:parent-type="Constants.Z_FUNCTION_CALL"
					:z-key="argument.key"
					:readonly="hasNoImplementations()"
				></z-object-key>
			</li>
		</ul>
		<cdx-button :disabled="hasNoImplementations()" @click="callFunctionHandler">
			<label> {{ $i18n( 'wikilambda-call-function' ).text() }} </label>
		</cdx-button>
		<div v-if="resultZObject || orchestrating" class="ext-wikilambda-orchestrated-result">
			<template v-if="resultZObject">
				<span>{{ $i18n( 'wikilambda-orchestrated' ).text() }}</span>
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
				<em>{{ $i18n( 'wikilambda-orchestrated-loading' ).text() }}</em>
			</template>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	ZFunctionCall = require( '../types/ZFunctionCall.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	components: {
		'cdx-button': CdxButton
	},
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
				zFunctionCallObject = this.getZObjectAsJsonById( this.zobjectId );

			if ( this.getCurrentZObjectType === Constants.Z_IMPLEMENTATION ) {
				var zFunctionId = this.getZObjectAsJson[
					Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_IMPLEMENTATION_FUNCTION ][
					Constants.Z_REFERENCE_ID ];
				zFunctionCallObject[ Constants.Z_FUNCTION_CALL_FUNCTION ] =
					this.getZkeys[ zFunctionId ][ Constants.Z_PERSISTENTOBJECT_VALUE ];
				zFunctionCallObject[ Constants.Z_FUNCTION_CALL_FUNCTION ][ Constants.Z_FUNCTION_IMPLEMENTATIONS ] =
					[ Constants.Z_IMPLEMENTATION, this.getZObjectAsJson[ Constants.Z_PERSISTENTOBJECT_VALUE ] ];
			}

			this.orchestrating = true;

			this.initializeResultId( this.resultId )
				.then( function ( resultId ) {
					self.resultId = resultId;

					return self.callZFunction( { zobject: zFunctionCallObject, resultId: self.resultId } );
				} )
				.then( function () {
					self.orchestrating = false;
				} );
		},
		hasNoImplementations: function () {
			return this.zImplementations.length === 0;
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
